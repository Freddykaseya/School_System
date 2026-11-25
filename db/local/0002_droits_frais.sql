-- PC et centre de démonstration : l'administrateur peut retirer un frais de
-- la grille (Supabase donne ce droit par défaut). La règle d'accès
-- « admin_ecrit » limite toujours la suppression à l'administrateur, et
-- l'application refuse de retirer un frais qui a déjà reçu des paiements.
grant delete on public.echeances to authenticated;
