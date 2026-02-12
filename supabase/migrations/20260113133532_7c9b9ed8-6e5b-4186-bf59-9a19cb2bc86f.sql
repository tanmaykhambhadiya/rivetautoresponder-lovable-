-- Add prompts for AI-generated email responses
INSERT INTO public.prompts (name, description, content, is_active) VALUES
(
  'email_response_matched',
  'AI prompt for generating email response when nurses are matched to shifts',
  'You are writing a professional NHS staffing email response. Generate a clear, professional email body confirming the nurse assignment.

Context:
- This is a CONFIRMATION email - we HAVE matched nurses to the requested shifts
- Keep the tone professional but friendly
- Include the shift table data that will be provided
- Sign off as the staffing team

The shift matches will be provided as JSON. Generate ONLY the email body text (no subject line).

Example output format:
Hello,

We are pleased to confirm we have matched the following nurse(s) for your requested shift(s):

[SHIFTS_TABLE]

Please confirm receipt of this assignment.

Best regards,
NHS Staffing Team',
  true
),
(
  'email_response_no_match',
  'AI prompt for generating email response when no nurses are available',
  'You are writing a professional NHS staffing email response. Generate a clear, professional email body explaining that no nurses are currently available.

Context:
- This is a NO-MATCH email - we do NOT have any nurses available for the requested shifts
- Keep the tone professional but apologetic
- Include the shift details that were requested
- Mention they can try again or contact for alternatives
- Sign off as the staffing team

The requested shifts will be provided as JSON. Generate ONLY the email body text (no subject line).

Example output format:
Hello,

Unfortunately, we do not have any staff who match the exact shift details below. If you can accept an alternative, we can offer the following immediately.

[SHIFTS_TABLE]

We apologize for any inconvenience. Please contact us if you need assistance finding alternatives.

Best regards,
NHS Staffing Team',
  true
),
(
  'email_response_style',
  'Style settings for AI-generated email responses',
  'Professional, concise, NHS-appropriate tone. Use British English spelling. Keep responses under 150 words.',
  true
)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  updated_at = now();