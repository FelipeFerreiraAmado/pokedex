# Pokédex: API Restful com Spring Boot

API Restful para cadastro de pokémons (uma pokédex), desenvolvida nas aulas de Domain Driven Design Using Java (A39 a A44): Spring Boot, Oracle, Bean Validation, CORS e deploy no Render.

Projeto gerado no Spring Initializr: Maven, Java 21, Spring Boot 4.1.1, pacote `br.com.fiap`, com as dependências Spring Boot DevTools, Spring Web, Oracle Driver e Validation.

## Estrutura

| Pacote | Classe | Papel |
|---|---|---|
| `to` | `PokemonTO` | dados do pokémon (codigo, nome, altura, peso, categoria, dataDaCaptura) com Bean Validation |
| `dao` | `ConnectionFactory` | conexão com o Oracle, lendo as variáveis de ambiente `DB_URL`, `DB_USER` e `DB_PASSWORD` |
| `dao` | `PokemonDAO` | `findAll`, `findByCodigo`, `save`, `delete` e `update` na tabela `DDD_POKEMONS` |
| `bo` | `PokemonBO` | regras de negócio |
| `resource` | `PokemonResource` | endpoints REST em `/pokedex` |
| `resource` | `CorsFilter` | libera o acesso de um front-end de outra origem (CORS) |

## Endpoints

| Verbo | URI | Método | Sucesso | Falha |
|---|---|---|---|---|
| GET | `/pokedex` | `findAll()` | 200 OK | 404 Not Found |
| GET | `/pokedex/{codigo}` | `findByCodigo()` | 200 OK | 404 Not Found |
| POST | `/pokedex` | `save()` | 201 Created | 400 Bad Request |
| PUT | `/pokedex/{codigo}` | `update()` | 201 Created | 400 Bad Request |
| DELETE | `/pokedex/{codigo}` | `delete()` | 204 No Content | 404 Not Found |

Validações (Bean Validation, com `@Valid`): `nome` e `categoria` não podem ficar em branco, `altura` e `peso` são obrigatórios e maiores que zero, e `dataDaCaptura` não pode ser uma data futura.

Exemplo de JSON:

```json
{
  "nome": "Bulbasaur",
  "altura": 0.7,
  "peso": 6.9,
  "categoria": "Semente",
  "dataDaCaptura": "2025-02-27"
}
```

## Como rodar

1. No Oracle SQL Developer, rode o script [`docs/ddd_pokemons.sql`](docs/ddd_pokemons.sql) para criar a tabela `DDD_POKEMONS`.
2. Abra a pasta do projeto no IntelliJ e espere o Maven carregar.
3. Em **Run > Edit Configurations > PokedexApplication > Environment variables**, informe as credenciais do banco:
   ```
   DB_URL=jdbc:oracle:thin:@oracle.fiap.com.br:1521:ORCL;DB_USER=seu_usuario;DB_PASSWORD=sua_senha
   ```
4. Rode a classe `PokedexApplication` e acesse http://localhost:8080/pokedex.

Sem as variáveis de ambiente, a API sobe, mas cada chamada falha com "Variáveis de ambiente do banco não configuradas!" no console.

## Testando no Insomnia

- Importe a collection [`docs/insomnia-api-pokedex.json`](docs/insomnia-api-pokedex.json) (botão **Import** > arquivo). Ela traz as requisições findAll, findByCodigo, save, update e delete.
- [`docs/json-cadastro-pokemons.txt`](docs/json-cadastro-pokemons.txt) tem JSONs para cadastrar vários pokémons, e também JSONs inválidos para ver o Bean Validation devolver 400.
- [`docs/json-atualizacao-pokemon.txt`](docs/json-atualizacao-pokemon.txt) tem JSONs para o PUT.

## Front-end

A pasta [`front-end`](front-end) tem uma pokédex em HTML, CSS e JavaScript que consome a API: lista, cadastra, edita e exclui pokémons. Com a API rodando, abra o `front-end/index.html` no navegador. O endereço da API fica na constante `API_URL`, no começo do `app.js`.

## Build

```
./mvnw clean -DskipTests package
java -jar target/pokedex-0.0.1-SNAPSHOT.jar
```

No PowerShell, defina as variáveis antes do `java -jar`:

```
$env:DB_URL="jdbc:oracle:thin:@oracle.fiap.com.br:1521:ORCL"; $env:DB_USER="seu_usuario"; $env:DB_PASSWORD="sua_senha"
```

## Deploy no Render

1. Crie um repositório no GitHub e envie o projeto (`git init`, `git add .`, `git commit -m "first commit"`, `git branch -M main`, `git remote add origin ...`, `git push -u origin main`).
2. No Render, crie um **Web Service** a partir do repositório (ele usa o `Dockerfile` do projeto) e escolha a instância gratuita.
3. Em **Environment Variables**, cadastre `DB_URL`, `DB_USER` e `DB_PASSWORD`.
4. Depois do deploy, troque `API_URL` no `front-end/app.js` pela URL do Render seguida de `/pokedex`.
