
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
