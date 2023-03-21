import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import { assertEquals } from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import { atmp, collect, map, mapError, pipe, sequence } from './index.ts'
import type { Attempt, Result, ErrorWithMessage } from './index.ts'

const voidFn = () => {}
const toString = (a: unknown) => `${a}`
const append = (a: string, b: string) => `${a}${b}`
const add = (a: number, b: number) => a + b
const asyncAdd = (a: number, b: number) => Promise.resolve(a + b)
const faultyAdd = (a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
}
const alwaysThrow = () => {
  throw new Error('always throw', { cause: 'it was made for this' })
}

describe('atmp', () => {
  it('infers the types if has no arguments or return', async () => {
    const fn: Attempt<typeof voidFn> = atmp(() => {})
    const res: Result<void> = await fn()

    assertEquals(res, [undefined, null])
  })

  it('infers the types if has arguments and a return', async () => {
    const fn: Attempt<typeof add> = atmp(add)
    const res: Result<number> = await fn(1, 2)

    assertEquals(res, [3, null])
  })

  it('infers the types of async functions', async () => {
    const fn: Attempt<typeof asyncAdd> = atmp(asyncAdd)
    const res: Result<number> = await fn(1, 2)

    assertEquals(res, [3, null])
  })

  it('catch errors', async () => {
    const fn: Attempt<typeof faultyAdd> = atmp(faultyAdd)
    const [res, err]: Result<number> = await fn(1, 2)

    assertEquals(res, null)
    assertEquals(err![0].message, 'a is 1')
  })
})

describe('pipe', () => {
  it('sends the results of the first function to the second and infers types', async () => {
    const fn: Attempt<(a: number, b: number) => string> = pipe(
      atmp(add),
      atmp(toString),
    )
    const res: Result<string> = await fn(1, 2)

    assertEquals(res, ['3', null])
  })

  it('catches the errors from function A', async () => {
    const fn: Attempt<(a: number, b: number) => string> = pipe(
      atmp(faultyAdd),
      atmp(toString),
    )
    const [res, err]: Result<string> = await fn(1, 2)

    assertEquals(res, null)
    assertEquals(err![0].message, 'a is 1')
  })

  it('catches the errors from function B', async () => {
    const fn: Attempt<(a: number, b: number) => never> = pipe(
      atmp(add),
      atmp(alwaysThrow),
      atmp(toString),
    )
    const [res, err]: Result<never> = await fn(1, 2)

    assertEquals(res, null)
    assertEquals(err![0].message, 'always throw')
    assertEquals(err![0].cause, 'it was made for this')
  })
})

describe('sequence', () => {
  it('sends the results of the first function to the second and saves every step of the result', async () => {
    const fn: Attempt<(a: number, b: number) => [number, string]> = sequence(
      atmp(add),
      atmp(toString),
    )
    const res: Result<[number, string]> = await fn(1, 2)

    assertEquals(res, [[3, '3'], null])
  })

  it('catches the errors from function A', async () => {
    const fn: Attempt<(a: number, b: number) => [number, string]> = sequence(
      atmp(faultyAdd),
      atmp(toString),
    )
    const [res, err]: Result<[number, string]> = await fn(1, 2)

    assertEquals(res, null)
    assertEquals(err![0].message, 'a is 1')
  })
})

describe('collect', () => {
  it('collects the results of an object of attempts into a result with same format', async () => {
    const fn = collect({
      add: atmp(add),
      string: atmp(toString),
      void: atmp(voidFn),
    })
    const res = await fn(1, 2)

    assertEquals(res, [{ add: 3, string: '1', void: undefined }, null])
  })

  it('uses the same arguments for every function', async () => {
    const fn = collect({
      add: atmp(add),
      string: atmp(append),
    })
    const res = await fn(1, 2)

    assertEquals(res, [{ add: 3, string: '12' }, null])
  })

  it('collects the errors in the error array', async () => {
    const fn = collect({
      error1: atmp(faultyAdd),
      error2: atmp(faultyAdd),
    })
    const [res, err] = await fn(1, 2)

    assertEquals(res, null)
    assertEquals(err![0].message, 'a is 1')
    assertEquals(err![1].message, 'a is 1')
  })
})

describe('map', () => {
  it('maps over an attempt function successful result', async () => {
    const fn: Attempt<(a: number, b: number) => boolean> = map(
      atmp(add),
      (a) => a + 1 === 4,
    )
    const res: Result<boolean> = await fn(1, 2)

    assertEquals(res, [true, null])
  })

  it('maps over a composition', async () => {
    const fn: Attempt<(a: number, b: number) => boolean> = map(
      pipe(atmp(add), atmp(toString)),
      (a) => typeof a === 'string',
    )
    const res: Result<boolean> = await fn(1, 2)

    assertEquals(res, [true, null])
  })

  it('does not do anything when the function fails', async () => {
    const fn: Attempt<(a: number, b: number) => boolean> = map(
      atmp(faultyAdd),
      (a) => a + 1 === 4,
    )
    const [res, err]: Result<boolean> = await fn(1, 2)

    assertEquals(res, null)
    assertEquals(err![0].message, 'a is 1')
  })
})

const cleanError = (err: ErrorWithMessage) => ({ message: err.message + '!!!' })
describe('mapError', () => {
  it('maps over the error results of an attempt function', async () => {
    const fn: Attempt<(a: number, b: number) => number> = mapError(
      atmp(faultyAdd),
      cleanError,
    )
    const [res, err]: Result<number> = await fn(1, 2)

    assertEquals(res, null)
    assertEquals(err![0].message, 'a is 1!!!')
  })
})
