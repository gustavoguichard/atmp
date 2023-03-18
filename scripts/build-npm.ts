import { build, emptyDir } from 'https://deno.land/x/dnt@0.31.0/mod.ts'
import pkg from '../deno.json' assert { type: 'json' }

await emptyDir('./npm')

await build({
  scriptModule: 'cjs',
  typeCheck: false,
  declaration: true,
  entryPoints: ['./src/index.ts'],
  outDir: './npm',
  shims: { deno: true },
  package: {
    name: 'atmp',
    version: pkg.version,
    description:
      'Add a safe layer to your functions and catch errors without try/catch blocks. Inspired by domain-functions',
    license: 'MIT',
    author: 'Gustavo Guichard',
    bugs: {
      url: 'https://github.com/gustavoguichard/atmp/issues',
    },
    homepage: 'https://github.com/gustavoguichard/atmp',
  },
})

// post build steps
Deno.copyFileSync('LICENSE', 'npm/LICENSE')
// Deno.copyFileSync('README.md', 'npm/README.md')
