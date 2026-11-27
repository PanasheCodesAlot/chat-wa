// supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'


// const PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_sazskulCSLl6Mt6ZwlBw3w_yvNThKxm'
// const PUBLIC_SUPABASE_URL = 'https://grjulfjflluweshgjgjg.supabase.co'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables.');
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);

/**
 * Generate a random filename-safe identifier.
 */
function generateRandomAlphanumeric(length = 36) {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(
    randomValues,
    (value) => chars[value % chars.length]
  ).join('');
}

/**
 * Apply simple filters to a Supabase query.
 *
 * Examples:
 * {
 *   eq: { auth_user_id: userId },
 *   order: { created_at: 'desc' },
 *   limit: 20
 * }
 */
function prepareFilters(query, filters = {}) {
  let preparedQuery = query;

  for (const [operator, payload] of Object.entries(filters || {})) {
    if (operator === 'limit' && typeof payload === 'number') {
      preparedQuery = preparedQuery.limit(payload);
      continue;
    }

    if (operator === 'range' && Array.isArray(payload)) {
      preparedQuery = preparedQuery.range(payload[0], payload[1]);
      continue;
    }

    if (operator === 'order' && payload && typeof payload === 'object') {
      for (const [column, direction] of Object.entries(payload)) {
        preparedQuery = preparedQuery.order(column, {
          ascending: direction !== 'desc'
        });
      }

      continue;
    }

    if (!payload || typeof payload !== 'object') {
      continue;
    }

    if (typeof preparedQuery[operator] !== 'function') {
      continue;
    }

    for (const [column, value] of Object.entries(payload)) {
      preparedQuery = preparedQuery[operator](column, value);
    }
  }

  return preparedQuery;
}

/**
 * Base database access class.
 */
export class dbConn {
  async execute(query) {
    const { data, error } = await query;
    return { data, error };
  }

  async select(table, columns = '*', filters = {}) {
    let query = supabase
      .from(table)
      .select(columns);

    query = prepareFilters(query, filters);

    return this.execute(query);
  }

  async insert(table, row, options = {}) {
    let query = supabase
      .from(table)
      .insert(row);

    if (options.select !== false) {
      query = query.select(options.columns || '*');
    }

    return this.execute(query);
  }

  async update(table, changes, filters = {}, options = {}) {
    let query = supabase
      .from(table)
      .update(changes);

    query = prepareFilters(query, filters);

    if (options.select !== false) {
      query = query.select(options.columns || '*');
    }

    return this.execute(query);
  }

  async delete(table, filters = {}) {
    if (!filters || Object.keys(filters).length === 0) {
      throw new Error(
        'Refusing to delete without filters.'
      );
    }

    let query = supabase
      .from(table)
      .delete();

    query = prepareFilters(query, filters);

    return this.execute(query);
  }

  async rpc(functionName, params = undefined) {
    const { data, error } = await supabase.rpc(
      functionName,
      params
    );

    return { data, error };
  }

  async upload(bucket, file, filename = null) {
    if (!file) {
      throw new Error('A file is required.');
    }

    const extension = file.name?.includes('.')
      ? `.${file.name.split('.').pop()}`
      : '';

    const path =
      filename ||
      `${generateRandomAlphanumeric()}${extension}`;

    const { data, error } = await supabase
      .storage
      .from(bucket)
      .upload(path, file, {
        upsert: false
      });

    if (error) {
      throw { data, error };
    }

    const publicUrlResult = supabase
      .storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      data: {
        ...data,
        path,
        url: publicUrlResult.data.publicUrl
      },
      error: null
    };
  }

  async removeFile(bucket, paths) {
    const filePaths = Array.isArray(paths)
      ? paths
      : [paths];

    const { data, error } = await supabase
      .storage
      .from(bucket)
      .remove(filePaths);

    return { data, error };
  }
}

/**
 * Authentication and current-user profile access.
 */
export class auth extends dbConn {
    async signUp(email, password, name) {
    if (!email || !password) {
        throw new Error('Email and password are required.');
    }

    const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        // options: {
        // data: {
        //     full_name: name?.trim() || null
        // }
        // }
    });

    if (error) {
        const messageByCode = {
        user_already_exists: 'An account with this email already exists.',
        signup_disabled: 'Signups are currently disabled.',
        weak_password: 'Password is too weak. Please use a stronger password.'
        };

        error.message = messageByCode[error.code] || error.message

        // Enhance the error object with a custom message
        throw {
        data,
        error,
        message: messageByCode[error.code] || error.message
        };
    }

    return data;
    }

  async signIn(email, password) {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

    if (error) {
      const messageByCode = {
        invalid_credentials:
          'Check your email and password and try again.',
        over_request_rate_limit:
          'Too many attempts. Please wait and try again later.',
        email_not_confirmed:
          'Please confirm your email address before signing in.'
      };

      error.message = messageByCode[error.code] || error.message

      throw {
        data,
        error,
        message:
          messageByCode[error.code] ||
          error.message
      };
    }

    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw { error };
    }
  }

  async getUserSession() {
    const { data, error } =
      await supabase.auth.getUser();

    if (error) {
      throw { data, error };
    }

    return data.user;
  }

  async verifySession() {
    const user = await this.getUserSession();

    return {
      user,
      authenticated: Boolean(user)
    };
  }

  async getProfile(columns = '*') {
    const user = await this.getUserSession();

    const { data, error } = await supabase
      .from('users')
      .select(columns)
      .eq('auth_user_id', user.id)
      .single();

    if (error) {
      throw { data, error };
    }

    return data;
  }

  async updateName(name) {
    const user = await this.getUserSession();

    const { data, error } = await supabase
      .from('users')
      .update({ name: name?.trim() || null })
      .eq('auth_user_id', user.id)
      .select('email, name, created_at')
      .single();

    if (error) {
      throw { data, error };
    }

    return data;
  }

  async changePassword(password) {
    const { data, error } =
      await supabase.auth.updateUser({
        password
      });

    if (error) {
      throw { data, error };
    }

    return data;
  }

  async forgotPassword(email, redirectTo) {
    const options = redirectTo
      ? { redirectTo }
      : undefined;

    const { data, error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        options
      );

    if (error) {
      throw { data, error };
    }

    return data;
  }

    async sendMagicLink(email, redirectTo) {
    if (!email || !email.trim()) {
        throw {
        message: 'Please enter your email address.'
        };
    }

    const normalizedEmail = email.trim().toLowerCase();

    const options = redirectTo
        ? { emailRedirectTo: redirectTo }
        : undefined;

    const { data, error } =
        await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options
        });

    if (error) {
        const messageByCode = {
        over_request_rate_limit:
            'Too many requests. Please wait a moment and try again.',

        email_provider_disabled:
            'Email authentication is currently unavailable.',

        email_address_invalid:
            'Please enter a valid email address.'
        };

        throw {
        data,
        error,
        message:
            messageByCode[error.code] ||
            'We could not send the magic link. Please try again.'
        };
    }

    return {
        data,
        message:
        'If an account exists for this email, a magic link has been sent.'
    };
    }

  async refreshSession() {
    const { data, error } =
      await supabase.auth.refreshSession();

    if (error) {
      throw { data, error };
    }

    return data;
  }

  onAuthStateChange(callback) {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(callback);

    return subscription;
  }
}

/**
 * Generic data access wrapper.
 */
export class access extends dbConn {
  async add(table, data, options = {}) {
    return this.insert(table, data, options);
  }

  async get(table, columns = '*', filters = {}) {
    return this.select(table, columns, filters);
  }

  async change(
    table,
    data,
    filters = {},
    options = {}
  ) {
    return this.update(table, data, filters, options);
  }

  async count(table, filters = {}) {
    let query = supabase
      .from(table)
      .select('*', {
        count: 'exact',
        head: true
      });

    query = prepareFilters(query, filters);

    const { count, error } = await query;

    return { count, error };
  }

  async rpc(functionName, params = undefined) {
    return super.rpc(functionName, params);
  }
}