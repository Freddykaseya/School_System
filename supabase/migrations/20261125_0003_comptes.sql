-- =====================================================================
-- ERP Écoles — gestion des comptes par l'administrateur
-- * Une adresse e-mail = un seul compte (sans tenir compte des majuscules).
-- * Toute création ou modification de compte (rôle, école, désactivation)
--   est écrite dans journal_audit, comme le reste.
-- =====================================================================

create unique index if not exists profils_email_unique on public.profils (lower(email));

create trigger journal_profils after insert or update or delete on public.profils
  for each row execute function public.ecrire_journal();
