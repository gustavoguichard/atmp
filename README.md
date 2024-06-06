# Deprecated
This library was deprecated as it became a base for what came to be a much better project: [composable-functions](https://github.com/seasonedcc/composable-functions) . Check it out!

# atmp

A lightweight TS library for error handling and function composition with a focus on simplicity and type safety. Inspired by [domain-functions](https://github.com/seasonedcc/domain-functions) and Go's [error handling pattern](https://go.dev/blog/error-handling-and-go).

### Without `atmp`:
Let's be honest: The `try/catch` syntax sucks!

Whenever you have a sequence of functions that can fail, you may easily end up with code like this:
```ts
let a, b
try {
  a = await getA()
} catch (e) {
  // handle error
}
try {
  const b = await getB(a)
} catch (e) {
  // handle error
}
```

There are alternatives like the one suggested in this [Fireship's video](https://www.youtube.com/shorts/ITogH7lJTyE) where it is proposed this replacement for `try/catch`?
```ts
const [a, errorA] = await trycatch(() => getA())
const [b, errorB] = await trycatch(() => getB(a))
```

It is cool - and also inspired this library - but it can still lead to a lot of `if/else` blocks.
### With `atmp`:

The idea of `atmp` is to follow the suggested approach above but wrapping the functions in a Monad so you can compose them in a safe way.

```ts
import { atmp } from 'atmp-fns'

const add5 = pipe(atmp(add2), atmp(asyncAdd3))
const result: Result<number> = await add5(5)
//     ^? [number, null] | [null, ErrorWithMessage[]]
// result is 10
```

Of course you can use `atmp` without composition:
```ts
const result: Result<number> = await atmp(add5)(5)
// result is 10
```

---
## Features

- Simple error handling with `atmp` function
- Function composition using `pipe`, `sequence`, and `collect`
- Map over successful results with `map`
- Map over error results with `mapError`


## Installation

```bash
npm install atmp-fns
```

## Usage

Here is a basic example of how to use the `atmp` library:

```ts
import { atmp } from 'atmp-fns'

const add = (a: number, b: number) => a + b

// Wrap a function with atmp to handle errors
const [data, error] = await atmp(add)(1, 3)
// The result is going to be either [number, null] or [null, ErrorWithMessage[]]
```

```ts
import { atmp, pipe, collect, map } from 'atmp-fns'

const faultyAdd = (a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
}

// Compose functions using pipe
const addAndToString = pipe(atmp(add), atmp(String))

// Collect multiple async results
const collectedResults = collect({ add: atmp(add), faultyAdd: atmp(faultyAdd) })
// When it succeeds
const results = await collectedResults(2, 1)
// results is going to be [{ add: 3, faultyAdd: 3 }, null]

// When it fails
const results = await collectedResults(1, 2)
// results is going to be [null, [{ message: 'a is 1' }]]

// Map over successful results
const addAndCheck = map(atmp(add), (result) => result === 3)
const [result, error] = await addAndCheck(1, 2)
// result is going to be [true, null]
```

## Main Types

### Result&lt;T&gt;

`Result<T>` is a union type that represents the result of a function execution. It can be either a `Success<T>` or an `Error`.

### Success&lt;T&gt;

`Success<T>` is a tuple type that represents a successful function execution. The first element of the tuple is the result of type `T`, and the second element is `null`, indicating no error occurred.

### Error

`Error` is a tuple type that represents a failed function execution. The first element of the tuple is `null`, indicating no result, and the second element is an array of `ErrorWithMessage`.

### ErrorWithMessage

`ErrorWithMessage` is an object type that contains information about an error that occurred during function execution. It has a `message` property of type `string`, the whole `exception` of type `unknwon`, and an optional `cause` property of type `unknown`.

Example:

```typescript
type Result<T> = Success<T> | Error;
type Success<T> = [T, null];
type Error = [null, ErrorWithMessage[]];
type ErrorWithMessage = { message: string; exception?: unknown, cause?: unknown };
```

To distinguish between what may have cause the error you can use the `exception` stack trace or the `cause` property.
```ts
const willThrow = atmp(() => {
  throw new Error('always throw', { cause: 'Thrown by willThrow function' })
})
```

## API

### atmp(fn: T): Attempt&lt;T&gt;

Wrap a function with `atmp` to handle errors. If the function throws an error or returns a rejected promise, the error will be caught and returned in the error part of the `Result`.

Example:

```typescript
const wrappedAdd: Attempt<(a: number, b: number) => number> = atmp(add)
```

### pipe(...fns: Attempt[]): Attempt&lt;T&gt;

Compose multiple functions with `pipe`. Each function will receive the successful result of the previous function as argument. If a function fails, the composition will be short-circuited and the error will be returned.

Example:

```typescript
const addAndToString = pipe(atmp(add), atmp(String))
const [result, error] = await addAndToString(1, 2)
// result is going to be '3'
// error is going to be null
```

### sequence(...fns: Attempt[]): Attempt&lt;T[]&gt;

Exactly like `pipe` but it saves the result of previous steps in a tuple.

Example:

```typescript
const addAndToString = sequence(atmp(add), atmp(String))
const [[result1, result2], error] = await addAndToString(1, 2)
// result1 is going to be 3 and result2 is going to be '3'
// error is going to be null
```

### collect(fns: Record<string, Attempt>): Attempt&lt;T&gt;

Collect the results of multiple async functions into a single result object. If any function fails, the errors will be collected in the error part of the `Result`.

Example:

```typescript
const collectedResults = collect({ add: atmp(add), faultyAdd: atmp(faultyAdd) })
```

### map(fn: Attempt&lt;T&gt;, mapper: (a: T) => U) : Attempt&lt;U&gt;

Apply a mapper function to the successful result of a wrapped function. If the wrapped function fails, the error will be returned.

Example:

```typescript
const addAndCheck = map(atmp(add), (result) => result === 3)
```

### mapError(fn: Attempt&lt;T&gt;, mapper: (e: ErrorWithMessage) => ErrorWithMessage): Attempt&lt;T&gt;

Apply a mapper function to the error result of a wrapped function. If the wrapped function succeeds, the successful result will be returned.

Example:

```typescript
const wrappedFaultyAdd = mapError(atmp(faultyAdd), (error) => ({ message: error.message + '!' }))
```


# Contributing
Contributions are welcome! Please open an issue or a pull request.

## Running tests

To run the tests, execute the following command:

```bash
deno task test
```
