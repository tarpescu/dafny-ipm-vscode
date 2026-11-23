# dafny-ipm-vscode

Prototip de extensie VS Code pentru modul de demonstrare interactivă (IPM) din Dafny.

Când pui mouse-ul pe o linie din demonstrația unei leme marcate cu `{:ipm}`,
apare un hover cu **starea demonstrației după linia respectivă**: ipotezele,
scopul curent și scopurile rămase. E aceeași informație pe care o afișează
prototipul în terminal după fiecare tactică.

Exemplu, pe `examples/example1.dfy`:

| Hover pe | Tactica trimisă | Ce arată |
|---|---|---|
| `ensures {:ipm} ...` | – | scopul inițial |
| `if (x % 2 == 0) {` | `case (x % 2 == 0)` | ipoteza `(0 == (x % 2))`, 2 scopuri |
| primul `assert` | `assert ...` | trecut pe ramura `else`, ipoteza `¬((0 == (x % 2)))` |
| al doilea `assert` | `assert ...` | toate scopurile demonstrate ✓ |

## Cum funcționează

1. `proofScript.ts` găsește lema cu `{:ipm}` și transformă liniile din corp în tactici:
   - `if (c) {` → `case (c)`
   - `assert e;` → `assert e`
   - `assume e;` → `assume e`
   - `} else {` și `}` nu sunt tactici.
2. `hover.ts` scrie o copie a fișierului cu **corpul lemei golit** în `<workspace>/.ipm/`.
   Prototipul pornește de la scopul inițial, iar copia e în folderul montat, deci containerul o vede.
3. `runner.ts` rulează `docker exec -i ... python -u dafny-incipm.py /work/.ipm/<fișier>`
   și trimite tacticile pe rând. După fiecare tactică așteaptă promptul și păstrează starea.
4. `parser.ts` scoate ipotezele și scopul din textul afișat de prototip.
5. Rezultatul se ține în cache pentru fiecare versiune a fișierului.
   Primul hover durează (câteva secunde pe tactică), următoarele apar instant.
   Dacă modifici fișierul, se rulează din nou.

## Pornire

O singură dată, containerul cu prototipul reparat, cu folderul `examples` montat la `/work`:

```bash
docker commit ipm aipmda-fixed      # salvează reparațiile făcute în containerul ipm
docker run -d --name ipm-work -v "$HOME/Desktop/dafny-ipm-vscode/examples":/work aipmda-fixed sleep infinity
docker exec ipm-work ls /work       # trebuie să apară example1.dfy
```

Apoi:

```bash
npm install
npm test           # teste fără Docker (parser, tactici, runner cu un docker fals)
```

În VS Code:

1. Deschide repo-ul și apasă **F5**.
2. În fereastra nouă deschide folderul `examples`.
3. Deschide `example1.dfy` și pune mouse-ul pe liniile din lemă.

## Setări

| Setare | Implicit |
|---|---|
| `dafnyIpm.dockerCommand` | `docker` |
| `dafnyIpm.container` | `ipm-work` |
| `dafnyIpm.prototypeDir` | `/app/workdir` |
| `dafnyIpm.containerMountPath` | `/work` |
| `dafnyIpm.stepTimeoutSeconds` | `120` |
