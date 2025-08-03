import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import arraySupport from 'dayjs/plugin/arraySupport';
// import badMutable from 'dayjs/plugin/badMutable'
import bigIntSupport from 'dayjs/plugin/bigIntSupport';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import calendar from 'dayjs/plugin/calendar';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import dayOfYear from 'dayjs/plugin/dayOfYear';
// import devHelper from 'dayjs/plugin/devHelper'
import duration from 'dayjs/plugin/duration';
import isBetween from 'dayjs/plugin/isBetween';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import isMoment from 'dayjs/plugin/isMoment';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isToday from 'dayjs/plugin/isToday';
import isTomorrow from 'dayjs/plugin/isTomorrow';
import isYesterday from 'dayjs/plugin/isYesterday';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import minMax from 'dayjs/plugin/minMax';
import negativeYear from 'dayjs/plugin/negativeYear';
import objectSupport from 'dayjs/plugin/objectSupport';
import pluralGetSet from 'dayjs/plugin/pluralGetSet';
import preParsePostFormat from 'dayjs/plugin/preParsePostFormat';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import toArray from 'dayjs/plugin/toArray';
import toObject from 'dayjs/plugin/toObject';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekYear from 'dayjs/plugin/weekYear';
import humanizeDuration from 'humanize-duration';

dayjs.extend(advancedFormat);
dayjs.extend(arraySupport);
// dayjs.extend(badMutable)
dayjs.extend(bigIntSupport);
dayjs.extend(buddhistEra);
dayjs.extend(calendar);
dayjs.extend(customParseFormat);
dayjs.extend(dayOfYear);
// dayjs.extend(devHelper)
dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(isLeapYear);
dayjs.extend(isMoment);
dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);
dayjs.extend(minMax);
dayjs.extend(negativeYear);
dayjs.extend(objectSupport);
dayjs.extend(pluralGetSet);
dayjs.extend(preParsePostFormat);
dayjs.extend(quarterOfYear);
dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(toArray);
dayjs.extend(toObject);
dayjs.extend(updateLocale);
dayjs.extend(utc);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);

export { dayjs, humanizeDuration };

declare module 'dayjs' {
  interface Dayjs {
    /** calendar */
    calendar(referenceTime?: dayjs.ConfigType, formats?: object): string;
    /** calendar */

    /** dayOfYear */
    dayOfYear(): number;
    dayOfYear(value: number): dayjs.Dayjs;
    /** dayOfYear */

    /** duration */
    add(duration: dayjs.Duration): dayjs.Dayjs;
    subtract(duration: dayjs.Duration): dayjs.Dayjs;
    /** duration */

    /** isBetween */
    isBetween(a: dayjs.ConfigType, b: dayjs.ConfigType, c?: dayjs.OpUnitType | null, d?: '()' | '[]' | '[)' | '(]'): boolean;
    /** isBetween */

    /** isLeapYear */
    isLeapYear(): boolean;
    /** isLeapYear */

    /** isoWeek */
    isoWeekYear(): number;
    isoWeek(): number;
    isoWeek(value: number): dayjs.Dayjs;
    isoWeekday(): number;
    isoWeekday(value: number): dayjs.Dayjs;
    startOf(unit: dayjs.ISOUnitType): dayjs.Dayjs;
    endOf(unit: dayjs.ISOUnitType): dayjs.Dayjs;
    isSame(date?: dayjs.ConfigType, unit?: dayjs.ISOUnitType): boolean;
    isBefore(date?: dayjs.ConfigType, unit?: dayjs.ISOUnitType): boolean;
    isAfter(date?: dayjs.ConfigType, unit?: dayjs.ISOUnitType): boolean;
    /** isoWeek */

    /** isoWeeksInYear */
    isoWeeksInYear(): number;
    /** isoWeeksInYear */

    /** isSameOrAfter */
    isSameOrAfter(date?: dayjs.ConfigType, unit?: dayjs.OpUnitType): boolean;
    /** isSameOrAfter */

    /** isSameOrBefore */
    isSameOrBefore(date?: dayjs.ConfigType, unit?: dayjs.OpUnitType): boolean;
    /** isSameOrBefore */

    /** isToday */
    isToday(): boolean;
    /** isToday */

    /** isTomorrow */
    isTomorrow(): boolean;
    /** isTomorrow */

    /** isYesterday */
    isYesterday(): boolean;
    /** isYesterday */

    /** localeData */
    localeData(): dayjs.InstanceLocaleDataReturn;
    /** localeData */

    /** objectSupport */
    set(argument: object): dayjs.Dayjs;
    add(argument: object): dayjs.Dayjs;
    subtract(argument: object): dayjs.Dayjs;
    /** objectSupport */

    /** pluralGetSet */
    years(): number;
    years(value: number): dayjs.Dayjs;
    months(): number;
    months(value: number): dayjs.Dayjs;
    dates(): number;
    dates(value: number): dayjs.Dayjs;
    weeks(): number;
    weeks(value: number): dayjs.Dayjs;
    days(): number;
    days(value: number): dayjs.Dayjs;
    hours(): number;
    hours(value: number): dayjs.Dayjs;
    minutes(): number;
    minutes(value: number): dayjs.Dayjs;
    seconds(): number;
    seconds(value: number): dayjs.Dayjs;
    milliseconds(): number;
    milliseconds(value: number): dayjs.Dayjs;
    /** pluralGetSet */

    /** quarterOfYear */
    quarter(): number;
    quarter(quarter: number): dayjs.Dayjs;
    add(value: number, unit: dayjs.QUnitType): dayjs.Dayjs;
    subtract(value: number, unit: dayjs.QUnitType): dayjs.Dayjs;
    startOf(unit: dayjs.QUnitType | dayjs.OpUnitType): dayjs.Dayjs;
    endOf(unit: dayjs.QUnitType | dayjs.OpUnitType): dayjs.Dayjs;
    isSame(date?: dayjs.ConfigType, unit?: dayjs.QUnitType): boolean;
    isBefore(date?: dayjs.ConfigType, unit?: dayjs.QUnitType): boolean;
    isAfter(date?: dayjs.ConfigType, unit?: dayjs.QUnitType): boolean;
    /** quarterOfYear */

    /** relativeTime */
    fromNow(withoutSuffix?: boolean): string;
    from(compared: dayjs.ConfigType, withoutSuffix?: boolean): string;
    toNow(withoutSuffix?: boolean): string;
    to(compared: dayjs.ConfigType, withoutSuffix?: boolean): string;
    /** relativeTime */

    /** timezone */
    tz(timezone?: string, keepLocalTime?: boolean): dayjs.Dayjs;
    offsetName(type?: 'short' | 'long'): string | undefined;
    /** timezone */

    /** toArray */
    toArray(): number[];
    /** toArray */

    /** toObject */
    toObject(): dayjs.DayjsObject;
    /** toObject */

    /** utc */
    utc(keepLocalTime?: boolean): dayjs.Dayjs;
    local(): dayjs.Dayjs;
    isUTC(): boolean;
    utcOffset(offset: number | string, keepLocalTime?: boolean): dayjs.Dayjs;
    /** utc */

    /** weekday */
    weekday(): number;
    weekday(value: number): dayjs.Dayjs;
    /** weekday */

    /** weekOfYear */
    week(): number;
    week(value: number): dayjs.Dayjs;
    /** weekOfYear */

    /** weekYear */
    weekYear(): number;
    /** weekYear */
  }

  interface ConfigTypeMap {
    /** arraySupport */
    arraySupport: [number?, number?, number?, number?, number?, number?, number?];
    /** arraySupport */

    /** bigIntSupport */
    bigIntSupport: BigInt;
    /** bigIntSupport */

    /** objectSupport */
    objectSupport: {
      years?: number | string;
      year?: number | string;
      y?: number | string;
      months?: number | string;
      month?: number | string;
      M?: number | string;
      days?: number | string;
      day?: number | string;
      d?: number | string;
      dates?: number | string;
      date?: number | string;
      D?: number | string;
      hours?: number | string;
      hour?: number | string;
      h?: number | string;
      minutes?: number | string;
      minute?: number | string;
      m?: number | string;
      seconds?: number | string;
      second?: number | string;
      s?: number | string;
      milliseconds?: number | string;
      millisecond?: number | string;
      ms?: number | string;
    };
    /** objectSupport */
  }

  /** bigIntSupport */
  function unix(t: BigInt): dayjs.Dayjs;
  /** bigIntSupport */

  /** duration */
  type DurationUnitsObjectType = Partial<{
    [unit in Exclude<dayjs.UnitTypeLongPlural, 'dates'> | 'weeks']: number;
  }>;
  type DurationUnitType = Exclude<dayjs.OpUnitType, 'date' | 'dates'>;
  type CreateDurationType = ((units: dayjs.DurationUnitsObjectType) => dayjs.Duration) &
    ((time: number, unit?: dayjs.DurationUnitType) => dayjs.Duration) &
    ((ISO_8601: string) => dayjs.Duration);
  type AddDurationType = dayjs.CreateDurationType & ((duration: dayjs.Duration) => dayjs.Duration);

  interface Duration {
    new (input: string | number | object, unit?: string, locale?: string): dayjs.Duration;
    clone(): dayjs.Duration;
    humanize(withSuffix?: boolean): string;
    milliseconds(): number;
    asMilliseconds(): number;
    seconds(): number;
    asSeconds(): number;
    minutes(): number;
    asMinutes(): number;
    hours(): number;
    asHours(): number;
    days(): number;
    asDays(): number;
    weeks(): number;
    asWeeks(): number;
    months(): number;
    asMonths(): number;
    years(): number;
    asYears(): number;
    as(unit: dayjs.DurationUnitType): number;
    get(unit: dayjs.DurationUnitType): number;
    add: dayjs.AddDurationType;
    subtract: dayjs.AddDurationType;
    toJSON(): string;
    toISOString(): string;
    format(formatStr?: string): string;
    locale(locale: string): dayjs.Duration;
  }

  // @ts-expect-error
  const duration: dayjs.CreateDurationType;
  function isDuration(d: any): d is dayjs.Duration;
  /** duration */

  /** isMoment */
  function isMoment(input: any): boolean;
  /** isMoment */

  /** isoWeek */
  type ISOUnitType = dayjs.OpUnitType | 'isoWeek';
  /** isoWeek */

  /** localeData */
  // @ts-expect-error
  type WeekdayNames = [string, string, string, string, string, string, string];
  // @ts-expect-error
  type MonthNames = [string, string, string, string, string, string, string, string, string, string, string, string];

  interface InstanceLocaleDataReturn {
    firstDayOfWeek(): number;
    weekdays(instance?: dayjs.Dayjs): dayjs.WeekdayNames;
    weekdaysShort(instance?: dayjs.Dayjs): dayjs.WeekdayNames;
    weekdaysMin(instance?: dayjs.Dayjs): dayjs.WeekdayNames;
    months(instance?: dayjs.Dayjs): dayjs.MonthNames;
    monthsShort(instance?: dayjs.Dayjs): dayjs.MonthNames;
    longDateFormat(format: string): string;
    meridiem(hour?: number, minute?: number, isLower?: boolean): string;
    ordinal(n: number): string;
  }

  interface GlobalLocaleDataReturn {
    firstDayOfWeek(): number;
    weekdays(): dayjs.WeekdayNames;
    weekdaysShort(): dayjs.WeekdayNames;
    weekdaysMin(): dayjs.WeekdayNames;
    months(): dayjs.MonthNames;
    monthsShort(): dayjs.MonthNames;
    longDateFormat(format: string): string;
    meridiem(hour?: number, minute?: number, isLower?: boolean): string;
    ordinal(n: number): string;
  }

  function weekdays(localOrder?: boolean): dayjs.WeekdayNames;
  function weekdaysShort(localOrder?: boolean): dayjs.WeekdayNames;
  function weekdaysMin(localOrder?: boolean): dayjs.WeekdayNames;
  function monthsShort(): dayjs.MonthNames;
  function months(): dayjs.MonthNames;
  function localeData(): dayjs.GlobalLocaleDataReturn;
  /** localeData */

  /** minMax */
  function max(dayjs: [dayjs.Dayjs, ...dayjs.Dayjs[]]): dayjs.Dayjs;
  function max(noDates: never[]): null;
  function max(maybeDates: dayjs.Dayjs[]): dayjs.Dayjs | null;
  function max(...dayjs: [dayjs.Dayjs, ...dayjs.Dayjs[]]): dayjs.Dayjs;
  function max(...noDates: never[]): null;
  function max(...maybeDates: dayjs.Dayjs[]): dayjs.Dayjs | null;
  function min(dayjs: [dayjs.Dayjs, ...dayjs.Dayjs[]]): dayjs.Dayjs;
  function min(noDates: never[]): null;
  function min(maybeDates: dayjs.Dayjs[]): dayjs.Dayjs | null;
  function min(...dayjs: [dayjs.Dayjs, ...dayjs.Dayjs[]]): dayjs.Dayjs;
  function min(...noDates: never[]): null;
  function min(...maybeDates: dayjs.Dayjs[]): dayjs.Dayjs | null;
  /** minMax */

  /** timezone */
  interface DayjsTimezone {
    (date?: dayjs.ConfigType, timezone?: string): dayjs.Dayjs;
    (date: dayjs.ConfigType, format: string, timezone?: string): dayjs.Dayjs;
    guess(): string;
    setDefault(timezone?: string): void;
  }

  // @ts-expect-error
  const tz: dayjs.DayjsTimezone;
  /** timezone */

  /** toObject */
  interface DayjsObject {
    years: number;
    months: number;
    date: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
  }
  /** toObject */

  /** updateLocale */
  function updateLocale(localeName: string, customConfig: Record<string, unknown>): Record<string, unknown>;
  /** updateLocale */

  /** utc */
  function utc(config?: dayjs.ConfigType, format?: string, strict?: boolean): dayjs.Dayjs;
  /** utc */
}
