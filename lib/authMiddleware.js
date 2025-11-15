import { supabase } from './supabaseClient';

/**
 * Extract user session from request
 * Supports both cookie-based and header-based authentication
 */
export async function getUserFromRequest(req) {
  try {
    // Try to get token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Try to get token from cookie
    if (!token && req.cookies?.['sb-access-token']) {
      token = req.cookies['sb-access-token'];
    }

    if (!token) {
      return { user: null, error: 'No authentication token found' };
    }

    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null, error: error?.message || 'Invalid token' };
    }

    // Fetch additional user data from users table (including role)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      // User exists in auth but not in users table - create them
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          id: user.id,
          email: user.email,
          name: user.email.split('@')[0],
          role: 'agent'
        }])
        .select()
        .single();

      if (createError) {
        return { user: null, error: 'Failed to create user profile' };
      }

      return { user: newUser, error: null };
    }

    return { user: userData, error: null };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(req, res, next) {
  const { user, error } = await getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: error || 'Authentication required' 
    });
  }

  // Attach user to request object
  req.user = user;

  if (next) {
    return next();
  }

  return { user };
}

/**
 * Middleware to require admin role
 */
export async function requireAdmin(req, res, next) {
  const { user, error } = await getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: error || 'Authentication required' 
    });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Admin access required' 
    });
  }

  req.user = user;

  if (next) {
    return next();
  }

  return { user };
}

/**
 * Check if user has access to a specific chatroom
 */
export async function checkChatroomAccess(userId, chatroomId, isAdmin) {
  if (isAdmin) {
    return true; // Admins have access to all chatrooms
  }

  const { data, error } = await supabase
    .from('user_chatrooms')
    .select('chatroom_id')
    .eq('user_id', userId)
    .eq('chatroom_id', chatroomId)
    .single();

  return !error && data !== null;
}

/**
 * Get user's accessible chatroom IDs
 */
export async function getUserChatroomIds(userId, isAdmin) {
  if (isAdmin) {
    // Admins see all chatrooms
    const { data } = await supabase
      .from('chatrooms')
      .select('id');
    return data?.map(c => c.id) || [];
  }

  const { data } = await supabase
    .from('user_chatrooms')
    .select('chatroom_id')
    .eq('user_id', userId);

  return data?.map(uc => uc.chatroom_id) || [];
}
