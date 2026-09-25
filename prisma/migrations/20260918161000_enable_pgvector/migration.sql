-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "Embedding" ADD COLUMN     "vectorPg" vector;
ALTER TABLE "Embedding" ALTER COLUMN "vectorPg" TYPE vector(256);

UPDATE "Embedding" AS e
SET "vectorPg" = (
  '[' || (
    SELECT string_agg(value::text, ',' ORDER BY ordinality)
    FROM jsonb_array_elements(e."vector"::jsonb) WITH ORDINALITY
  ) || ']'
)::vector
WHERE e."vector" IS NOT NULL;

CREATE INDEX "Embedding_vectorPg_hnsw_idx"
ON "Embedding" USING hnsw ("vectorPg" vector_cosine_ops);
