// Runs an edge function on $PORT (Deno.serve in the function has no port option).
const port = Number(Deno.env.get('PORT'));
const orig = Deno.serve.bind(Deno);
// deno-lint-ignore no-explicit-any
Object.defineProperty(Deno, 'serve', { value: (h: any) => orig({ port, hostname: '127.0.0.1', onListen() {} }, h), configurable: true, writable: true });
await import(Deno.args[0]); // extra args (e.g. a process tag) are ignored
