import { supabase } from '@/integrations/supabase/client';

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters_json: any;
  is_active: boolean;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
}

export async function createSavedSearch(name: string, filters: any): Promise<SavedSearch | null> {
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      name,
      filters_json: filters,
      is_active: true,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating saved search:', error);
    return null;
  }

  return data as unknown as SavedSearch;
}

export async function getSavedSearches(): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved searches:', error);
    return [];
  }

  return (data as unknown as SavedSearch[]) || [];
}

export async function updateSavedSearch(
  id: string,
  updates: Partial<SavedSearch>
): Promise<boolean> {
  const { error } = await supabase
    .from('saved_searches')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating saved search:', error);
    return false;
  }

  return true;
}

export async function deleteSavedSearch(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting saved search:', error);
    return false;
  }

  return true;
}

export async function getSearchMatches(searchId: string) {
  const { data, error } = await supabase
    .from('search_matches')
    .select(`
      *,
      listing:listings(*)
    `)
    .eq('search_id', searchId)
    .order('matched_at', { ascending: false });

  if (error) {
    console.error('Error fetching search matches:', error);
    return [];
  }

  return data || [];
}
