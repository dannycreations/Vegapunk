/**
 * Truncates a string if it exceeds a specified length, appending an omission
 * string. Truncation can be customized to occur at a specific separator.
 *
 * @example
 * truncate('This is a very long string that needs to be truncated.', { length: 25 });
 * // => 'This is a very long st...'
 *
 * truncate('Short enough', { length: 30 });
 * // => 'Short enough'
 *
 * truncate('No options provided for this very long string example.');
 * // => 'No options provided for this ...'
 *
 * truncate('Truncate with custom omission.', { length: 20, omission: ' [more]' });
 * // => 'Truncate w [more]'
 *
 * truncate('break at last space, please', { length: 20, separator: ' ' });
 * // => 'break at last...'
 *
 * truncate('short', { length: 0 });
 * // => '...'
 *
 * truncate('tiny text', { length: 2, omission: '...' });
 * // => '..'
 *
 * @param {string} str The string to truncate.
 * @param {TruncateOptions=} [options={}] Configuration options for truncation.
 *   Defaults to an empty object, which implies default values for `length` (30)
 *   and `omission` ('...'). See {@link TruncateOptions}.
 * @returns {string} The truncated string.
 */
export function truncate(str: string, options: TruncateOptions = {}): string {
  const targetLength = Math.max(0, options.length ?? 30)
  const omissionText = options.omission ?? '...'
  if (targetLength === 0) {
    return omissionText
  } else if (str.length <= targetLength) {
    return str
  }

  const contentMaxLength = targetLength - omissionText.length
  if (contentMaxLength <= 0) {
    return omissionText.slice(0, targetLength)
  }

  const { separator } = options
  let truncatedStr = str.slice(0, contentMaxLength)
  if (separator) {
    const lastSepIdx = truncatedStr.lastIndexOf(separator)
    if (lastSepIdx > -1) {
      truncatedStr = truncatedStr.slice(0, lastSepIdx)
    }
  }
  return truncatedStr + omissionText
}

/**
 * Defines the options for the {@link truncate} function.
 */
export interface TruncateOptions {
  /**
   * The desired maximum length of the truncated string, including the
   * `omission` string.
   * If undefined, the `truncate` function defaults this to 30.
   */
  length?: number

  /**
   * The string to append at the end of the truncated string, indicating
   * that it has been shortened.
   * If undefined, the `truncate` function defaults this to '...'.
   */
  omission?: string

  /**
   * A string or pattern. If specified, the `truncate` function will attempt to
   * break the string at the last occurrence of this `separator` that falls
   * within the `length` limit before appending the `omission` string.
   */
  separator?: string
}
