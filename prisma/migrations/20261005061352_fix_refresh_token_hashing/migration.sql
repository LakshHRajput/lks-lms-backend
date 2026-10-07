-- AlterTable
ALTER TABLE `refresh_tokens`
  DROP INDEX `refresh_tokens_token_key`,
  CHANGE COLUMN `token` `tokenHash` VARCHAR(191) NOT NULL,
  ADD UNIQUE INDEX `refresh_tokens_tokenHash_key` (`tokenHash`);
