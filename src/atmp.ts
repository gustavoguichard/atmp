import { toErrorWithMessage } from './errors.ts'
import {
  Attempt,
  ErrorWithMessage,
  First,
  Fn,
  Last,
  Result,
  UnpackAll,
  UnpackResult,
} from './types.ts'

function atmp<T extends Fn>(fn: T): Attempt<T> {
  return async (...args) => {
    try {
      const result = await fn(...(args as any[]))
      return [result, null]
    } catch (e) {
      return [null, [toErrorWithMessage(e)]]
    }
  }
}

function collect<T extends Record<string, Attempt>>(fns: T) {
  return (async (...args) => {
    const results = await Promise.all(
      Object.entries(fns).map(([key, fn]) =>
        fn(...args).then((res) => [key, res] as const),
      ),
    )
    const [successes, errors] = results.reduce(
      ([successes, errors], [key, result]) => {
        if (result[1]) {
          return [successes, [...errors, ...result[1]]] as [
            Record<string, Result<any>>,
            Array<ErrorWithMessage>,
          ]
        } else {
          successes[key] = result[0]
          return [successes, errors] as [
            Record<string, Result<any>>,
            Array<ErrorWithMessage>,
          ]
        }
      },
      [{}, []] as [Record<string, Result<any>>, Array<ErrorWithMessage>],
    )
    return errors.length ? [null, errors] : [successes, null]
  }) as Attempt<
    (...args: Parameters<Extract<T[keyof T], Attempt>>) => {
      [key in keyof T]: UnpackResult<ReturnType<Extract<T[key], Attempt>>>
    }
  >
}

function pipe<T extends [Attempt, ...Attempt[]]>(...fns: T) {
  return (async (...args) => {
    const [res, err] = await sequence(...fns)(...args)
    return err ? [null, err] : [res.at(-1), null]
  }) as Attempt<
    (
      ...args: Parameters<Extract<First<T>, Attempt>>
    ) => UnpackResult<ReturnType<Extract<Last<T>, Attempt>>>
  >
}

function sequence<T extends [Attempt, ...Attempt[]]>(...fns: T) {
  return (async (...args) => {
    const [head, ...tail] = fns

    const [res, err] = await head(...args)
    if (err) return [null, err]

    const result = [res]
    for await (const fn of tail) {
      const [res, err] = await fn(result.at(-1))
      if (err) return [null, err]
      result.push(res)
    }
    return [result, null]
  }) as Attempt<
    (...args: Parameters<Extract<First<T>, Attempt>>) => UnpackAll<T>
  >
}

function map<T extends Attempt, R>(
  fn: T,
  mapper: (res: UnpackResult<ReturnType<T>>) => R,
) {
  return (async (...args) => {
    const [res, err] = await fn(...args)
    return err ? [null, err] : [mapper(res), null]
  }) as Attempt<(...args: Parameters<T>) => R>
}

function mapError<T extends Attempt, R>(
  fn: T,
  mapper: (err: ErrorWithMessage) => ErrorWithMessage,
) {
  return (async (...args) => {
    const [res, err] = await fn(...args)
    return err ? [null, err.map(mapper)] : [res, null]
  }) as T
}

export { atmp, collect, pipe, map, mapError, sequence }
