import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShiftRequest {
  date: string;
  start_time: string;
  end_time: string;
  unit: string;
  grade: string;
}

interface NurseMatch {
  nurse_id: string;
  nurse_name: string;
  shift: ShiftRequest;
}

async function callLovableAI(prompt: string, content: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  console.log("Calling Lovable AI gateway...");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: content }
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add funds to your workspace.");
    }
    throw new Error(`Lovable AI call failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log("AI response received successfully");
  return data.choices[0].message.content;
}

async function classifyEmail(classifierPrompt: string, emailBody: string, subject: string): Promise<string> {
  const content = `Subject: ${subject}\n\nBody:\n${emailBody}`;
  const result = await callLovableAI(classifierPrompt, content);
  
  // Check if the result contains "nhs_shift_asking"
  if (result.toLowerCase().includes("nhs_shift_asking")) {
    return "nhs_shift_asking";
  }
  return "other";
}

async function extractShiftsFromEmail(emailBody: string): Promise<ShiftRequest[]> {
  const extractorPrompt = `You are a data extractor. Extract all shift requests from this email.
For each shift, extract:
- date (format: YYYY-MM-DD)
- start_time (format: HH:MM)
- end_time (format: HH:MM)
- unit (the ward/department name)
- grade (e.g., "Band 5", "RN", etc.)

Respond ONLY with a JSON array of shifts. Example:
[{"date": "2025-11-29", "start_time": "19:00", "end_time": "07:30", "unit": "Puffin Ward RDH", "grade": "Band 5 RN"}]

If no valid shifts found, respond with: []`;

  const result = await callLovableAI(extractorPrompt, emailBody);
  
  try {
    // Extract JSON from the response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (e) {
    console.error("Failed to parse shifts:", e, result);
    return [];
  }
}

async function findMatchingNurse(
  supabase: any,
  shift: ShiftRequest,
  matcherPrompt: string,
  assignedNurses: Set<string>
): Promise<{ nurse_id: string; nurse_name: string } | null> {
  // Get available nurses for this date (fetch all, filter by unit case-insensitively)
  const { data: availability, error } = await supabase
    .from("nurse_availability")
    .select("*, nurse:nurses(*)")
    .eq("available_date", shift.date)
    .eq("is_assigned", false);

  if (error || !availability || availability.length === 0) {
    console.log(`No availability found for date: ${shift.date}`);
    return null;
  }

  // Normalize unit name for comparison
  const normalizeUnit = (unit: string) => unit?.toLowerCase().trim() || '';
  const requestedUnit = normalizeUnit(shift.unit);
  
  console.log(`Looking for unit: "${shift.unit}" (normalized: "${requestedUnit}")`);
  console.log(`Available units: ${availability.map((a: any) => a.unit).join(', ')}`);

  // Filter by unit (case-insensitive), time, and grade
  const matchingAvailability = availability.filter((a: any) => {
    // Check if this nurse is already assigned in this batch
    if (assignedNurses.has(a.nurse_id)) {
      console.log(`Nurse ${a.nurse?.name} already assigned in this batch`);
      return false;
    }
    
    // Case-insensitive unit matching
    const availUnit = normalizeUnit(a.unit);
    const unitMatch = availUnit === requestedUnit || 
                      availUnit.includes(requestedUnit) || 
                      requestedUnit.includes(availUnit);
    
    if (!unitMatch) {
      console.log(`Unit mismatch: "${a.unit}" vs "${shift.unit}"`);
      return false;
    }
    
    // Check time overlap
    const shiftStart = shift.start_time;
    const shiftEnd = shift.end_time;
    const availStart = a.shift_start.substring(0, 5);
    const availEnd = a.shift_end.substring(0, 5);
    
    const timesMatch = availStart <= shiftStart && 
                       (availEnd >= shiftEnd || 
                        (shiftEnd < shiftStart && availEnd >= shiftEnd));
    
    // Flexible grade matching (bidirectional)
    const nurseGrade = a.nurse?.grade?.toLowerCase() || '';
    const shiftGrade = shift.grade.toLowerCase();
    const gradeMatch = nurseGrade && (
      shiftGrade.includes(nurseGrade) || 
      nurseGrade.includes(shiftGrade) ||
      (shiftGrade.includes('band 5') && nurseGrade.includes('band 5')) ||
      (shiftGrade.includes('rn') && nurseGrade.includes('rn'))
    );
    
    console.log(`Nurse ${a.nurse?.name}: unit=${unitMatch}, time=${timesMatch}, grade=${gradeMatch} (${nurseGrade} vs ${shiftGrade})`);
    
    return unitMatch && (timesMatch || gradeMatch);
  });

  if (matchingAvailability.length === 0) {
    console.log(`No matching nurse after filtering for shift: ${JSON.stringify(shift)}`);
    return null;
  }

  // Use the first available nurse
  const match = matchingAvailability[0];
  console.log(`Matched nurse: ${match.nurse?.name} for unit ${shift.unit}`);
  return {
    nurse_id: match.nurse_id,
    nurse_name: match.nurse?.name || "Unknown Nurse"
  };
}

function generateShiftsTable(matches: NurseMatch[], includeNurse: boolean = true): string {
  const headers = includeNurse 
    ? ['Date', 'Time', 'Unit', 'Grade', 'Assigned Nurse']
    : ['Date', 'Time', 'Unit', 'Requested Grade'];
  
  const headerCells = headers.map(h => 
    `<th style="padding: 10px; border: 1px solid #ddd; text-align: left; background-color: #f0f0f0;">${h}</th>`
  ).join('');

  const rows = matches.map(m => {
    const cells = includeNurse
      ? [m.shift.date, `${m.shift.start_time} - ${m.shift.end_time}`, m.shift.unit, m.shift.grade, `<strong>${m.nurse_name}</strong>`]
      : [m.shift.date, `${m.shift.start_time} - ${m.shift.end_time}`, m.shift.unit, m.shift.grade];
    
    return `<tr>${cells.map(c => `<td style="padding: 10px; border: 1px solid #ddd;">${c}</td>`).join('')}</tr>`;
  }).join('');

  return `
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function generateAIEmailContent(
  prompt: string,
  stylePrompt: string,
  shiftData: any[],
  isMatch: boolean
): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.log("No LOVABLE_API_KEY, using fallback template");
    return "";
  }

  const shiftJson = JSON.stringify(shiftData, null, 2);
  const systemPrompt = `${prompt}\n\nStyle guidelines: ${stylePrompt}\n\nIMPORTANT: Generate properly formatted HTML content. Use tags like <h2>, <p>, <strong>, <br> for formatting. Include the [SHIFTS_TABLE] placeholder where the shifts table should appear.`;
  const userContent = `Generate an HTML email response for the following ${isMatch ? 'matched' : 'requested'} shifts:\n\n${shiftJson}`;

  try {
    console.log("Generating AI email content with HTML support...");
    const startTime = Date.now();
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    const aiTime = Date.now() - startTime;
    console.log(`AI response generated in ${aiTime}ms`);

    if (!response.ok) {
      console.error("AI generation failed:", response.status);
      return "";
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || "";
    
    // Clean up any markdown code blocks that AI might add
    content = content.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    
    console.log("AI HTML content generated successfully");
    return content;
  } catch (e) {
    console.error("AI generation error:", e);
    return "";
  }
}

async function generateResponseEmail(
  matches: NurseMatch[],
  shifts: ShiftRequest[],
  matchedPrompt: string,
  noMatchPrompt: string,
  stylePrompt: string,
  sendOnNoMatch: boolean
): Promise<{ body: string; isNoMatch: boolean }> {
  const hasMatches = matches.length > 0;
  
  if (!hasMatches && !sendOnNoMatch) {
    return { body: "", isNoMatch: true };
  }

  // Generate the shifts table
  const shiftsTable = hasMatches 
    ? generateShiftsTable(matches, true)
    : generateShiftsTable(shifts.map(s => ({ nurse_id: '', nurse_name: '', shift: s })), false);

  // Generate AI content
  const prompt = hasMatches ? matchedPrompt : noMatchPrompt;
  const shiftData = hasMatches 
    ? matches.map(m => ({ nurse: m.nurse_name, ...m.shift }))
    : shifts;
  
  let emailText = await generateAIEmailContent(prompt, stylePrompt, shiftData, hasMatches);
  
  // Replace [SHIFTS_TABLE] placeholder with actual table
  if (emailText.includes("[SHIFTS_TABLE]")) {
    emailText = emailText.replace("[SHIFTS_TABLE]", shiftsTable);
  } else {
    // If no placeholder, append table after first paragraph
    const lines = emailText.split('\n\n');
    if (lines.length > 1) {
      lines.splice(1, 0, shiftsTable);
      emailText = lines.join('\n\n');
    } else {
      emailText += '\n\n' + shiftsTable;
    }
  }

  // If AI failed, use fallback template
  if (!emailText.trim()) {
    if (hasMatches) {
      emailText = `<h2>NHS Shift Assignment Confirmation</h2>
<p>Hello,</p>
<p>We have successfully matched the following nurse(s) to your requested shift(s):</p>
${shiftsTable}
<p>Please confirm receipt of this assignment.</p>
<p>Best regards,<br>NHS Staffing Team</p>`;
    } else {
      emailText = `<h2>NHS Shift Request Update</h2>
<p>Hello,</p>
<p>Unfortunately, we do not currently have any nurses available who match the exact shift details below:</p>
${shiftsTable}
<p>We apologise for any inconvenience. Please contact us if you need assistance finding alternatives.</p>
<p>Best regards,<br>NHS Staffing Team</p>`;
    }
  }

  // Wrap in HTML if not already
  if (!emailText.includes('<html>')) {
    emailText = `<html><body style="font-family: Arial, sans-serif; color: #333;">${emailText}</body></html>`;
  }

  return { body: emailText, isNoMatch: !hasMatches };
}

async function sendGmailResponse(supabase: any, to: string, subject: string, body: string): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    
    // Call the gmail-send-email function
    const response = await fetch(`${supabaseUrl}/functions/v1/gmail-send-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, subject: `Re: ${subject}`, body }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send email:", error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error("Email send error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Processing emails started...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if email processing is enabled and get all settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("*");

    const getSetting = (key: string) => settings?.find(s => s.key === key)?.value;
    
    const processingEnabled = getSetting("email_processing_enabled") === true;
    const autoResponseEnabled = getSetting("auto_response_enabled") === true;
    // Default to instant mode for fastest response
    const instantModeValue = getSetting("instant_response_mode");
    const instantMode = instantModeValue === true || instantModeValue === "true" || instantModeValue === undefined;
    const responseDelay = instantMode ? 0 : parseInt(String(getSetting("response_delay_seconds") || "0"), 10);
    
    console.log(`⚡ Processing config: instant=${instantMode}, delay=${responseDelay}s, autoResponse=${autoResponseEnabled}`);

    if (!processingEnabled) {
      console.log("Email processing is disabled");
      return new Response(
        JSON.stringify({ message: "Email processing is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get prompts
    const { data: prompts } = await supabase
      .from("prompts")
      .select("*")
      .eq("is_active", true);

    const classifierPrompt = prompts?.find(p => p.name === "email_classifier")?.content;
    const matcherPrompt = prompts?.find(p => p.name === "shift_matcher")?.content;
    const matchedPrompt = prompts?.find(p => p.name === "email_response_matched")?.content || "";
    const noMatchPrompt = prompts?.find(p => p.name === "email_response_no_match")?.content || "";
    const stylePrompt = prompts?.find(p => p.name === "email_response_style")?.content || "";
    const sendOnNoMatch = getSetting("send_on_no_match") === true;

    if (!classifierPrompt || !matcherPrompt) {
      throw new Error("Required prompts not configured");
    }

    // Get approved senders (we'll filter by organization when processing each email)
    const { data: approvedSenders } = await supabase
      .from("approved_senders")
      .select("email, organization_id")
      .eq("is_active", true);

    // Create a map of approved emails by organization
    const approvedSendersByOrg = new Map<string, Set<string>>();
    approvedSenders?.forEach(s => {
      const orgId = s.organization_id || 'global';
      if (!approvedSendersByOrg.has(orgId)) {
        approvedSendersByOrg.set(orgId, new Set());
      }
      approvedSendersByOrg.get(orgId)!.add(s.email.toLowerCase());
    });

    // Get emails that haven't been processed yet (not in email_logs)
    const { data: processedEmails } = await supabase
      .from("email_logs")
      .select("sender_email, subject, created_at");

    const processedKeys = new Set(
      processedEmails?.map(e => `${e.sender_email}|${e.subject}`) || []
    );

    // Get recent inbox emails
    const { data: inboxEmails, error: inboxError } = await supabase
      .from("inbox_emails")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(50);

    if (inboxError) throw inboxError;

    console.log(`Found ${inboxEmails?.length || 0} inbox emails to check`);

    let processed = 0;
    let matched = 0;
    let errors = 0;

    // Track nurses assigned in this batch to prevent double-booking
    const assignedNursesThisBatch = new Set<string>();

    for (const email of inboxEmails || []) {
      const emailKey = `${email.from_email}|${email.subject}`;
      
      // Skip if already processed
      if (processedKeys.has(emailKey)) {
        continue;
      }

      // Get the organization ID from the email
      const emailOrgId = email.organization_id || 'global';

      // Check if sender is approved for this organization
      const orgApprovedEmails = approvedSendersByOrg.get(emailOrgId) || new Set();
      const isApproved = orgApprovedEmails.has(email.from_email.toLowerCase());
      
      if (!isApproved) {
        console.log(`Skipping email from non-approved sender: ${email.from_email}`);
        // Log as blocked
        await supabase.from("email_logs").insert({
          sender_email: email.from_email,
          subject: email.subject,
          body: email.body,
          status: "blocked",
          error_message: "Sender not in approved list",
          organization_id: email.organization_id,
        });
        processed++;
        continue;
      }

      console.log(`Processing email from ${email.from_email}: ${email.subject}`);

      try {
        // Classify the email
        const classification = await classifyEmail(
          classifierPrompt,
          email.body || email.body_preview || "",
          email.subject || ""
        );

        console.log(`Email classification: ${classification}`);

        if (classification !== "nhs_shift_asking") {
          // Log as other/blocked
          await supabase.from("email_logs").insert({
            sender_email: email.from_email,
            subject: email.subject,
            body: email.body,
            status: "blocked",
            classification: "other",
            error_message: "Not a shift request email",
            organization_id: email.organization_id,
          });
          processed++;
          continue;
        }

        // Extract shifts from email
        const shifts = await extractShiftsFromEmail(email.body || email.body_preview || "");
        console.log(`Extracted ${shifts.length} shifts from email`);

        if (shifts.length === 0) {
          await supabase.from("email_logs").insert({
            sender_email: email.from_email,
            subject: email.subject,
            body: email.body,
            status: "failed",
            classification: "nhs_shift_asking",
            error_message: "Could not extract shift details from email",
            organization_id: email.organization_id,
          });
          processed++;
          errors++;
          continue;
        }

        // Find matching nurses for each shift
        const nurseMatches: NurseMatch[] = [];

        for (const shift of shifts) {
          const match = await findMatchingNurse(
            supabase,
            shift,
            matcherPrompt,
            assignedNursesThisBatch
          );

          if (match) {
            nurseMatches.push({
              ...match,
              shift
            });
            assignedNursesThisBatch.add(match.nurse_id);
          }
        }

        console.log(`Found ${nurseMatches.length} nurse matches`);

        // Generate response email using AI prompts
        const { body: responseBody, isNoMatch } = await generateResponseEmail(
          nurseMatches,
          shifts,
          matchedPrompt,
          noMatchPrompt,
          stylePrompt,
          sendOnNoMatch
        );

        // Skip if no match and not configured to send no-match emails
        if (!responseBody) {
          await supabase.from("email_logs").insert({
            sender_email: email.from_email,
            subject: email.subject,
            body: email.body,
            status: "failed",
            classification: "nhs_shift_asking",
            shift_date: shifts[0]?.date,
            shift_start: shifts[0]?.start_time,
            shift_end: shifts[0]?.end_time,
            unit: shifts[0]?.unit,
            grade: shifts[0]?.grade,
            error_message: "No matching nurses available for the requested shifts",
            organization_id: email.organization_id,
          });
          processed++;
          continue;
        }

        // Send response if auto-response is enabled
        let emailStatus = "pending";
        let errorMessage = null;

        if (autoResponseEnabled && responseBody) {
          // Apply response delay only if not in instant mode
          if (!instantMode && responseDelay > 0) {
            console.log(`Applying ${responseDelay}s delay before sending...`);
            await new Promise(r => setTimeout(r, responseDelay * 1000));
          } else {
            console.log(`⚡ INSTANT MODE: Sending response immediately`);
          }

          const sendStartTime = Date.now();
          const sent = await sendGmailResponse(
            supabase,
            email.from_email,
            email.subject || "Shift Request",
            responseBody
          );
          const responseTimeMs = Date.now() - sendStartTime;

          if (sent) {
            emailStatus = "sent";
            if (!isNoMatch) matched++;
            console.log(`Email sent in ${responseTimeMs}ms`);

            // Mark nurse availability as assigned (only for actual matches)
            if (!isNoMatch) {
              for (const match of nurseMatches) {
                await supabase
                  .from("nurse_availability")
                  .update({ is_assigned: true })
                  .eq("nurse_id", match.nurse_id)
                  .eq("available_date", match.shift.date)
                  .eq("unit", match.shift.unit);

                // Create shift assignment with organization_id
                await supabase.from("shift_assignments").insert({
                  nurse_id: match.nurse_id,
                  shift_date: match.shift.date,
                  shift_start: match.shift.start_time,
                  shift_end: match.shift.end_time,
                  unit: match.shift.unit,
                  grade: match.shift.grade,
                  organization_id: email.organization_id,
                });
              }
            }

            // Log response time with organization_id
            await supabase.from("email_logs").insert({
              sender_email: email.from_email,
              subject: email.subject,
              body: email.body,
              status: emailStatus,
              classification: "nhs_shift_asking",
              shift_date: shifts[0]?.date,
              shift_start: shifts[0]?.start_time,
              shift_end: shifts[0]?.end_time,
              unit: shifts[0]?.unit,
              grade: shifts[0]?.grade,
              matched_nurse_id: nurseMatches[0]?.nurse_id || null,
              response_body: responseBody,
              response_time_ms: responseTimeMs,
              processed_at: new Date().toISOString(),
              organization_id: email.organization_id,
            });
          } else {
            emailStatus = "failed";
            errorMessage = "Failed to send response email";
            errors++;

            await supabase.from("email_logs").insert({
              sender_email: email.from_email,
              subject: email.subject,
              body: email.body,
              status: emailStatus,
              classification: "nhs_shift_asking",
              shift_date: shifts[0]?.date,
              shift_start: shifts[0]?.start_time,
              shift_end: shifts[0]?.end_time,
              unit: shifts[0]?.unit,
              grade: shifts[0]?.grade,
              error_message: errorMessage,
              processed_at: new Date().toISOString(),
              organization_id: email.organization_id,
            });
          }
        }

        processed++;
      } catch (e) {
        console.error(`Error processing email ${email.id}:`, e);
        await supabase.from("email_logs").insert({
          sender_email: email.from_email,
          subject: email.subject,
          body: email.body,
          status: "failed",
          error_message: e instanceof Error ? e.message : "Unknown error",
          organization_id: email.organization_id,
        });
        processed++;
        errors++;
      }
    }

    const result = {
      success: true,
      processed,
      matched,
      errors,
      message: `Processed ${processed} emails, matched ${matched} shifts, ${errors} errors`
    };

    console.log("Processing complete:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Process emails failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
