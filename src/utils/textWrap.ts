const LABEL_MAX_LINES = 3

export function wrapLabelText(
  text: string,
  maxWidthPx: number,
  fontSize: number,
  charWidthRatio: number
): string[] {
  if (!text.trim()) return ['']
  const charWidth = fontSize * charWidthRatio
  const maxCharsPerLine = Math.max(6, Math.floor(maxWidthPx / charWidth))
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const trial = currentLine ? `${currentLine} ${word}` : word
    if (trial.length <= maxCharsPerLine) {
      currentLine = trial
    } else {
      if (currentLine) {
        lines.push(currentLine)
        if (lines.length >= LABEL_MAX_LINES) {
          const last = lines[LABEL_MAX_LINES - 1]!
          if (last.length > 3) {
            lines[LABEL_MAX_LINES - 1] = last.slice(0, -3) + '…'
          }
          return lines
        }
        currentLine = word
      } else {
        currentLine = word
      }
    }
  }
  if (currentLine) lines.push(currentLine)

  if (lines.length > LABEL_MAX_LINES) {
    const truncated: string[] = lines.slice(0, LABEL_MAX_LINES)
    const last = truncated[LABEL_MAX_LINES - 1]!
    if (last.length > 3) {
      truncated[LABEL_MAX_LINES - 1] = last.slice(0, -3) + '…'
    }
    return truncated
  }
  return lines
}
