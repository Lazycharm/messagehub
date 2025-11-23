import { supabaseAdmin } from '../../../lib/supabaseClient';
import { getUserFromRequest } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Get all system config settings
      const { data: settings, error } = await supabaseAdmin
        .from('settings')
        .select('*')
        .in('category', ['notification', 'email', 'quota', 'security']);

      if (error) {
        console.error('Error fetching system config:', error);
        return res.status(500).json({ error: 'Failed to fetch configuration' });
      }

      // Convert to key-value object
      const config = {};
      settings?.forEach(setting => {
        config[setting.key] = setting.value;
      });

      return res.status(200).json(config);
    }

    if (req.method === 'POST') {
      const { config, category } = req.body;

      if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: 'Invalid configuration data' });
      }

      // Upsert each setting
      const categoryLower = category?.toLowerCase() || 'general';
      
      const upsertPromises = Object.entries(config).map(async ([key, value]) => {
        return supabaseAdmin
          .from('settings')
          .upsert({
            key,
            value: typeof value === 'boolean' ? value.toString() : value,
            category: categoryLower,
          }, {
            onConflict: 'key'
          });
      });

      const results = await Promise.all(upsertPromises);
      
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Error saving config:', errors);
        return res.status(500).json({ error: 'Failed to save some settings' });
      }

      return res.status(200).json({ message: 'Configuration saved successfully' });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('System config API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
