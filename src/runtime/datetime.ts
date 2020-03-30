import { Availabilities } from './types'
import { RuntimeContext, Locale, isTrarnslateFallbackWarn, NOT_REOSLVED } from './context'
import { warn, isString, isArray, isBoolean, isPlainObject } from '../utils'

export const MISSING_RESOLVE_VALUE = ''
const datetimeFormatters: Record<string, Intl.DateTimeFormat> = Object.create(null)

/*
 * datetime
 *
 * usages:
 *    'short': {
 *      year: 'numeric', month: '2-digit', day: '2-digit',
 *      hour: '2-digit', minute: '2-digit'
 *    }
 *
 *    // datetimeable value only
 *    datetime(context, value)
 *
 *    // key argument
 *    datetime(context, value, 'short')
 *
 *    // key & locale argument
 *    datetime(context, value, 'short', 'ja-JP')
 *
 *    // object sytle argument
 *    datetime(context, value, { key: 'short', locale: 'ja-JP' })
 *
 *    // suppress localize fallback warning option, override context.fallbackWarn
 *    datetime(context, value, { key: 'short', locale: 'ja-JP', fallbackWarn: false })
 */

export type DateTimeOptions = {
  key?: string
  locale?: Locale,
  fallbackWarn?: boolean
}

export function datetime (
  context: RuntimeContext,
  value: number | Date,
  ...args: unknown[]
): string | number {
  const { datetimeFormats, _fallbackLocaleStack } = context

  if (__DEV__ && !Availabilities.dateTimeFormat) {
    warn(`Cannot format a Date value due to not supported Intl.DateTimeFormat.`)
    return MISSING_RESOLVE_VALUE
  }

  const options = parseArgs(...args)
  const { key } = options
  const fallbackWarn = isBoolean(options.fallbackWarn)
    ? options.fallbackWarn
    : context.fallbackWarn
  let locale = isString(options.locale) ? options.locale : context.locale
  // override with fallback locales
  if (isArray(_fallbackLocaleStack) && _fallbackLocaleStack.length > 0) {
    locale = _fallbackLocaleStack.shift() || locale
  }

  const fallback = (contxt: RuntimeContext, key: string, fallbackWarn: boolean | RegExp): string | number => {
    let ret: string | number = context.unresolving ? NOT_REOSLVED : MISSING_RESOLVE_VALUE
    if (context.fallbackLocales.length === 0) { return ret }
    if (context._fallbackLocaleStack && context._fallbackLocaleStack.length === 0) { return ret }
    if (!context._fallbackLocaleStack) {
      context._fallbackLocaleStack = [...context.fallbackLocales]
    }
    if (__DEV__ &&
      isTrarnslateFallbackWarn(fallbackWarn, key)) {
      warn(`Fall back to datetime format '${key}' key with '${context._fallbackLocaleStack.join(',')}' locale.`)
    }
    ret = datetime(context, value, ...args)
    if (context._fallbackLocaleStack && context._fallbackLocaleStack.length === 0) {
      context._fallbackLocaleStack = undefined
      if (ret === MISSING_RESOLVE_VALUE && context.unresolving) {
        ret = NOT_REOSLVED
      }
    }
    return ret
  }

  if (!isString(key)) {
    return new Intl.DateTimeFormat(locale).format(value)
  }

  const datetimeFormat = datetimeFormats[locale]
  if (!datetimeFormat) {
    return fallback(context, key, fallbackWarn)
  }

  const format = datetimeFormat[key]
  if (!format) {
    return fallback(context, key, fallbackWarn)
  }

  const id = `${locale}__${key}`
  const formatter = datetimeFormatters[id] || (datetimeFormatters[id] = new Intl.DateTimeFormat(locale, format))
  return formatter.format(value)
}

export function parseArgs (...args: unknown[]): DateTimeOptions {
  const [arg1, arg2] = args
  let options = {} as DateTimeOptions

  if (isString(arg1)) {
    options.key = arg1
  } else if (isPlainObject(arg1)) {
    options = arg1
  }

  if (isString(arg2)) {
    options.locale = arg2
  }

  return options
}