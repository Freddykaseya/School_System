-- =====================================================================
-- ERP Écoles — préparation de la synchronisation (PC de l'école → centre)
--
-- Chaque école travaille sur son propre PC, sans internet, et envoie ses
-- données au centre quand elle se connecte. Le centre doit alors garder
-- EXACTEMENT ce que l'école a enregistré : numéro de reçu, encaisseur,
-- date d'annulation. Ces copies sont écrites par le programme de
-- synchronisation, sans compte connecté (auth.uid() vide) ; tout ce qui
-- vient d'un utilisateur continue d'être contrôlé comme avant.
-- Exécutée au centre (Supabase) ET sur chaque PC.
-- =====================================================================

-- Numéro de reçu : attribué par la base pour un utilisateur ; conservé
-- tel quel pour une copie venue du PC d'une école.
create or replace function public.attribuer_numero_recu() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null and new.numero_recu is not null then
    insert into compteurs_recus (ecole_id, dernier) values (new.ecole_id, new.numero_recu)
    on conflict (ecole_id) do update set dernier = greatest(compteurs_recus.dernier, excluded.dernier);
    return new;
  end if;

  insert into compteurs_recus (ecole_id, dernier) values (new.ecole_id, 1)
  on conflict (ecole_id) do update set dernier = compteurs_recus.dernier + 1
  returning dernier into new.numero_recu;
  -- L'encaisseur est toujours le compte connecté.
  new.recu_par := coalesce(auth.uid(), new.recu_par);
  return new;
end $$;

-- Un paiement ne se modifie pas ; seule l'annulation est permise.
-- Nouveau : recevoir deux fois la même copie n'est pas une erreur (un envoi
-- interrompu est simplement refait), et une copie garde la date
-- d'annulation de l'école.
create or replace function public.proteger_paiement() returns trigger
language plpgsql as $$
begin
  if new is not distinct from old then
    return new;
  end if;
  if old.annule then
    raise exception 'Paiement déjà annulé : aucune modification possible.';
  end if;
  if (new.ecole_id, new.inscription_id, new.numero_recu, new.date_paiement, new.montant, new.devise, new.mode, new.recu_par)
     is distinct from
     (old.ecole_id, old.inscription_id, old.numero_recu, old.date_paiement, old.montant, old.devise, old.mode, old.recu_par) then
    raise exception 'Un paiement ne se modifie pas : annulez-le et saisissez-en un nouveau.';
  end if;
  if new.annule then
    if coalesce(length(trim(new.motif_annulation)), 0) < 5 then
      raise exception 'Le motif d''annulation est obligatoire (5 caractères au moins).';
    end if;
    if auth.uid() is not null then
      new.annule_par := auth.uid();
      new.annule_le := now();
    else
      new.annule_le := coalesce(new.annule_le, now());
    end if;
  end if;
  return new;
end $$;

-- Index pour les calculs de situation (par école, année, classe).
create index if not exists inscriptions_ecole_annee on public.inscriptions (ecole_id, annee_id);
create index if not exists inscriptions_classe on public.inscriptions (classe_id);
create index if not exists paiements_inscription on public.paiements (inscription_id) where not annule;
create index if not exists echeances_classe_annee on public.echeances (classe_id, annee_id);
