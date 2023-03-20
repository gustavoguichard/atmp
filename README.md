# atmp

A lightweight TS library for error handling and function composition with a focus on simplicity and type safety. Inspired by domain-functions.

## Features

- Simple error handling with `atmp` function
- Function composition using `pipe`
- Collect multiple async results with `collect`
- Map over successful results with `map`
- Map over error results with `mapError`

## Installation

```bash
npm install atmp
```

or

```bash
yarn add atmp
```

## Usage

Here is a basic example of how to use the `atmp` library:

```typescript
import { atmp, pipe, collect, map, mapError } from 'atmp'

const add = (a: number, b: number) => a + b
const faultyAdd = (a: number, b: number) => {
  if (a === 1) throw new Error('a is 1')
  return a + b
}

// Wrap a function with atmp to handle errors
const wrappedAdd = atmp(add)

// Compose functions using pipe
const addAndToString = pipe(atmp(add), atmp(String))

// Collect multiple async results
const collectedResults = collect({ add: atmp(add), faultyAdd: atmp(faultyAdd) })

// Map over successful results
const addAndCheck = map(atmp(add), (result) => result === 3)

// Map over error results
const wrappedFaultyAdd = mapError(atmp(faultyAdd), (error) => ({ message: error.message + '!' }))
```

## Main Types

### Result&lt;T&gt;

`Result<T>` is a union type that represents the result of a function execution. It can be either a `Success<T>` or an `Error`.

### Success&lt;T&gt;

`Success<T>` is a tuple type that represents a successful function execution. The first element of the tuple is the result of type `T`, and the second element is `null`, indicating no error occurred.

### Error

`Error` is a tuple type that represents a failed function execution. The first element of the tuple is `null`, indicating no result, and the second element is an array of `ErrorType`.

### ErrorType

`ErrorType` is an object type that contains information about an error that occurred during function execution. It has a `message` property of type `string` and an optional `exception` property of type `unknown`.

Example:

```typescript
type Result&lt;T&gt; = Success&lt;T&gt; | Error;
type Success&lt;T&gt; = [T, null];
type Error = [null, ErrorType[]];
type ErrorType = { message: string; exception?: unknown };
```

## API

### atmp(fn: T): Attempt&lt;T&gt;

Wrap a function with `atmp` to handle errors. If the function throws an error or returns a rejected promise, the error will be caught and returned in the error part of the `Result`.

Example:

```typescript
const wrappedAdd = atmp(add)
```

### pipe(...fns: T): Attempt&lt;...args: Parameters&lt;First&lt;T&gt;&gt;&gt;

Compose multiple functions with `pipe`. Each function will receive the successful result of the previous function. If a function fails, the composition will be short-circuited and the error will be returned.

Example:

```typescript
const addAndToString = pipe(atmp(add), atmp(String))
```

### collect(fns: T): Attempt&lt;...args: Parameters&lt;Extract&lt;T[keyof T], Attempt&gt;&gt;&gt;

Collect the results of multiple async functions into a single result object. If any function fails, the errors will be collected in the error part of the `Result`.

Example:

```typescript
const collectedResults = collect({ add: atmp(add), faultyAdd: atmp(faultyAdd) })
```

### map(fn: T, mapper: (res: UnpackResult&lt;ReturnType&lt;T&gt;&gt;) =&gt; R): Attempt&lt;...args: Parameters&lt;T&gt;&gt;

Apply a mapper function to the successful result of a wrapped function. If the wrapped function fails, the error will be returned.

Example:

```typescript
const addAndCheck = map(atmp(add), (result) => result === 3)
```

### mapError(fn: T, mapper: (error: UnpackError&lt;ReturnType&lt;T&gt;&gt;) =&gt; ErrorType): Attempt&lt;...args: Parameters&lt;T&gt;&gt;

Apply a mapper function to the error result of a wrapped function. If the wrapped function succeeds, the successful result will be returned.

Example:

```typescript
const wrappedFaultyAdd = mapError(atmp(faultyAdd), (error) => ({ message: error.message + '!' }))
```


## Tests

To run the tests, execute the following command:

```bash
deno test
```