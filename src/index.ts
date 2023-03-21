type Last<T extends readonly any[]> = T extends [...infer _I, infer L]
  ? L
  : never
type First<T extends readonly any[]> = T extends [infer F, ...infer _I]
  ? F
  : never
type ErrorWithMessage = {
  message: string
  exception?: unknown
  cause?: unknown
}
type Error = [null, [ErrorWithMessage, ...ErrorWithMessage[]]]
type Success<T> = [Awaited<T>, null]
type Result<T> = Success<T> | Error

type Fn = (...args: any[]) => any
type Attempt<T extends Fn = Fn> = (
  ...args: Parameters<T>
) => Promise<Result<ReturnType<T>>>

type UnpackResult<T> = Awaited<T> extends Result<infer R> ? R : never

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
  const [head, ...tail] = fns
  return ((...args) => {
    return tail.reduce(async (memo, fn) => {
      const [res, err] = await memo
      return err ? memo : fn(res)
    }, head(...args))
  }) as Attempt<
    (
      ...args: Parameters<Extract<First<T>, Attempt>>
    ) => UnpackResult<ReturnType<Extract<Last<T>, Attempt>>>
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

function objectHasKey<T extends string>(
  obj: unknown,
  key: T,
): obj is { [k in T]: unknown } {
  return typeof obj === 'object' && obj !== null && key in obj
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return objectHasKey(error, 'message') && typeof error.message === 'string'
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  return {
    message: isErrorWithMessage(maybeError)
      ? maybeError.message
      : String(maybeError),
    exception: maybeError,
    cause: objectHasKey(maybeError, 'cause') ? maybeError.cause : undefined,
  }
}

export type { Attempt, Result, ErrorWithMessage }
export { atmp, collect, pipe, map, mapError }
