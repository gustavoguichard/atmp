import { toErrorWithMessage } from './errors.ts'
import { Attempt, ErrorWithMessage, Fn, Result, UnpackResult } from './types.ts'

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

type CollectParams<T extends Record<string, Attempt>> = Parameters<T[keyof T]>
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
    (...args: CollectParams<T>) => {
      [key in keyof T]: UnpackResult<ReturnType<T[key]>>
    }
  >
}

type PipeReturn<Atmps extends unknown> = Atmps extends [
  Attempt<(...a: infer FI) => infer FO>,
  Attempt<(a: infer SI) => infer SO>,
  ...infer rest,
]
  ? FO extends SI
    ? PipeReturn<[Attempt<(...a: FI) => SO>, ...rest]>
    : Attempt<(...a: FI) => never>
  : Atmps extends [Attempt]
  ? Atmps[0]
  : void

function pipe<T extends [Attempt, ...Attempt[]]>(...fns: T) {
  return (async (...args: any[]) => {
    const [res, err] = await (sequence as Function)(...fns)(...args)
    return err ? [null, err] : [res.at(-1), null]
  }) as PipeReturn<T>
}

type SequenceReturn<
  Atmps extends unknown,
  Outputs extends unknown[] = [],
> = Atmps extends [
  Attempt<(...a: infer FI) => infer FO>,
  Attempt<(a: infer SI) => infer SO>,
  ...infer rest,
]
  ? FO extends SI
    ? SequenceReturn<[Attempt<(...a: FI) => SO>, ...rest], [...Outputs, FO]>
    : Attempt<(...a: FI) => never>
  : Atmps extends [Attempt<(...a: infer A) => infer O>]
  ? Attempt<(...a: A) => [...Outputs, O]>
  : void

function sequence<T extends [Attempt, ...Attempt[]]>(...fns: T) {
  return (async (...args: any) => {
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
  }) as SequenceReturn<T>
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
