import subprocess
import os
import pypdf

ps_code = """
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$inPath = [System.IO.Path]::GetFullPath('docs/report/VideoSense_AI_Sem5_Project_Report.docx')
$outPath = [System.IO.Path]::GetFullPath('docs/report/VideoSense_AI_Sem5_Project_Report.pdf')
$doc = $word.Documents.Open($inPath)

foreach ($story in $doc.StoryRanges) {
    $story.Fields.Update()
}

$doc.SaveAs([ref]$outPath, [ref]17)
$pageCount = $doc.ComputeStatistics(2)
$doc.Close([ref]$false)
$word.Quit()
Write-Host "Exported PDF with $pageCount pages to $outPath"
"""

with open('docs/report/export_pdf.ps1', 'w') as f:
    f.write(ps_code)

res = subprocess.run(['powershell', '-ExecutionPolicy', 'Bypass', '-File', 'docs/report/export_pdf.ps1'], capture_output=True, text=True)
print('STDOUT:', res.stdout)
print('STDERR:', res.stderr)

pdf_path = 'docs/report/VideoSense_AI_Sem5_Project_Report.pdf'
if os.path.exists(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    print(f'Total pages in generated PDF: {len(reader.pages)}')
    print(f'PDF file size: {os.path.getsize(pdf_path)} bytes')
else:
    print('PDF export failed!')
