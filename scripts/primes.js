const n = 1000;
const max = Math.floor(Math.sqrt(n));

const prime = Array.from({length: n}, () => true);

for (let i = 2; i <= max; i++) {
  if (prime[i]) {
    for (let j = i * i; j <= n; j += i) {
      prime[j] = false;
    }
  }
}

const primes = prime
  .map((p, i) => p ? i : null)
  .filter((_, i) => i > 0)
  .filter(p => p !== null);
primes.length = 91;

console.log(primes.join(', '));

console.log('---');
for (let i = 0; i < primes.length; i++) {
  console.log(`${i}: ${primes[i]}`);
}

const words = [0n];
let i = 0, j = 0;

for (let k = 0; k < 55; k++) {
  if (j >= 32) {
    words.push(0n);
    i++;
    j = 0;
  }
  words[i] += BigInt(primes[k]) << BigInt((31 - j++) * 8);
}

words.push(0n);
i++;
j = 0;

for (let k = 55; k < primes.length; k++) {
  if (j >= 32) {
    words.push(0n);
    i++;
    j = 0;
  }
  words[i] += BigInt(primes[k]) << BigInt((30 - j) * 8);
  j += 2;
}

console.log('---');
console.dir(words.map(w => '0x' + w.toString(16).padStart(64, '0')));
