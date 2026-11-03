param([string]$Out, [int]$Size = 180)
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap $Size, $Size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.InterpolationMode = 'HighQualityBicubic'
$g.ScaleTransform($Size / 180, $Size / 180)
function C([string]$hex, [int]$a = 255) { $c = [System.Drawing.ColorTranslator]::FromHtml($hex); [System.Drawing.Color]::FromArgb($a, $c) }
function P([float]$x, [float]$y) { New-Object System.Drawing.PointF $x, $y }

# Bakgrund: appens ljusa färg med en mjuk ljusning i mitten
$g.Clear((C '#f3e9db'))
$glow = New-Object System.Drawing.Drawing2D.GraphicsPath
$glow.AddEllipse(-20, -30, 220, 220)
$gb = New-Object System.Drawing.Drawing2D.PathGradientBrush $glow
$gb.CenterColor = (C '#fffaf2'); $gb.SurroundColors = @((C '#f3e9db'))
$g.FillPath($gb, $glow)

# Taggarna: en stjärna runt huvudet, ljusare upptill
$cx = 90; $cy = 90; $n = 20
$pts = for ($i = 0; $i -lt $n * 2; $i++) {
  $r = if ($i % 2 -eq 0) { 82 } else { 64 }
  $a = [Math]::PI * $i / $n - [Math]::PI / 2
  P ($cx + $r * [Math]::Cos($a)) ($cy + $r * [Math]::Sin($a) * 0.95)
}
$spikes = New-Object System.Drawing.Drawing2D.GraphicsPath
$spikes.AddPolygon([System.Drawing.PointF[]]$pts)
$sb = New-Object System.Drawing.Drawing2D.LinearGradientBrush (P 0 8), (P 0 172), (C '#c8ab93'), (C '#6f5545')
$g.FillPath($sb, $spikes)
$g.DrawPath((New-Object System.Drawing.Pen (C '#5c4538'), 2), $spikes)

# Öron
foreach ($ex in 50, 130) {
  $g.FillEllipse((New-Object System.Drawing.SolidBrush (C '#efdccb')), $ex - 15, 52, 30, 30)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush (C '#e9b7ae')), $ex - 8, 59, 16, 16)
}

# Ansiktet: ljust med skugga nedtill
$face = New-Object System.Drawing.Drawing2D.GraphicsPath
$face.AddEllipse(36, 62, 108, 98)
$fb = New-Object System.Drawing.Drawing2D.PathGradientBrush $face
$fb.CenterPoint = (P 88 92)
$fb.CenterColor = (C '#fff8ef'); $fb.SurroundColors = @((C '#d9bea6'))
$g.FillPath($fb, $face)

# Kinder
$cheek = New-Object System.Drawing.SolidBrush (C '#eaa89c' 150)
$g.FillEllipse($cheek, 44, 116, 24, 15)
$g.FillEllipse($cheek, 112, 116, 24, 15)

# Ögon med glans
$dark = New-Object System.Drawing.SolidBrush (C '#2f2925')
$white = New-Object System.Drawing.SolidBrush (C '#ffffff')
foreach ($ex in 66, 114) {
  $g.FillEllipse($dark, $ex - 9, 94, 18, 20)
  $g.FillEllipse($white, $ex - 3, 97, 7, 7)
}

# Nos och mun
$g.FillEllipse($dark, 79, 120, 22, 16)
$g.FillEllipse((New-Object System.Drawing.SolidBrush (C '#ffffff' 200)), 84, 122, 7, 5)
$mouth = New-Object System.Drawing.Pen (C '#5c4538'), 2.5
$mouth.StartCap = 'Round'; $mouth.EndCap = 'Round'
$g.DrawArc($mouth, 80, 132, 10, 9, 20, 140)
$g.DrawArc($mouth, 90, 132, 10, 9, 20, 140)

$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
"Sparad: $Out ($Size px)"
