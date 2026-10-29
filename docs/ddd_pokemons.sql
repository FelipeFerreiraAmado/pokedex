-- Rode este script no Oracle SQL Developer (conectado ao servidor Oracle)
-- para criar a tabela usada pela API Pokedex.

CREATE TABLE DDD_POKEMONS (
        CODIGO NUMBER GENERATED ALWAYS AS IDENTITY,
        NOME VARCHAR2(100),
        ALTURA NUMBER(5,2),
        PESO NUMBER(6,2),
        CATEGORIA VARCHAR2(100),
        DATA_DA_CAPTURA DATE,
        PRIMARY KEY (CODIGO)
);
