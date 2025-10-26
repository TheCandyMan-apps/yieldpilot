-- Create storage bucket for investment reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'investment-reports',
  'investment-reports',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
);

-- RLS policies for investment-reports bucket
CREATE POLICY "Users can view their own reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'investment-reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'investment-reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own reports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'investment-reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add pdf_url to deal_summaries for tracking generated reports
ALTER TABLE deal_summaries ADD COLUMN IF NOT EXISTS assumptions_hash TEXT;
ALTER TABLE deal_summaries ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN deal_summaries.assumptions_hash IS 'Hash of assumptions used for this report, for regeneration detection';
COMMENT ON COLUMN deal_summaries.generated_at IS 'Timestamp when the PDF was generated';