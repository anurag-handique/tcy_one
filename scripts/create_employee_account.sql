-- =====================================================================
-- TCY One — Employee Account Provisioning & Department Creation Function
-- Allows Super Admin to onboard employees with password and custom department
-- =====================================================================

create or replace function public.create_employee_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text default 'employee',
  p_department_name text default null,
  p_phone text default null,
  p_work_location text default 'Office'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_dept_id uuid;
  v_dept_code text;
begin
  -- 1. Input Validation
  if p_email is null or trim(p_email) = '' then
    raise exception 'Email is required';
  end if;
  if p_password is null or length(trim(p_password)) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;
  if p_full_name is null or trim(p_full_name) = '' then
    raise exception 'Full Name is required';
  end if;

  -- 2. Handle Department: Create if provided and does not exist
  if p_department_name is not null and trim(p_department_name) <> '' then
    -- Check if department already exists by name (case-insensitive)
    select id into v_dept_id 
    from public.departments 
    where lower(name) = lower(trim(p_department_name))
    limit 1;

    if v_dept_id is null then
      v_dept_code := upper(regexp_replace(trim(p_department_name), '[^a-zA-Z0-9]', '', 'g'));
      if length(v_dept_code) > 6 then
        v_dept_code := substring(v_dept_code from 1 for 6);
      end if;
      if v_dept_code = '' then
        v_dept_code := 'DEPT';
      end if;

      insert into public.departments (id, name, code, created_at, updated_at)
      values (
        gen_random_uuid(), 
        trim(p_department_name), 
        v_dept_code || '-' || floor(random() * 900 + 100)::text, 
        now(), 
        now()
      )
      returning id into v_dept_id;
    end if;
  end if;

  -- 3. Check if user already exists in auth.users
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));

  if v_user_id is not null then
    -- Update existing user credentials & metadata
    update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'role', p_role),
        updated_at = now()
    where id = v_user_id;
  else
    -- Generate new User UUID
    v_user_id := gen_random_uuid();

    -- Insert into auth.users
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(trim(p_email)),
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      null,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'role', p_role),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- Insert into auth.identities
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, lower(trim(p_email)))::jsonb,
      'email',
      v_user_id::text,
      null,
      now(),
      now()
    );
  end if;

  -- 4. Upsert into public.profiles
  insert into public.profiles (
    id,
    user_id,
    email,
    full_name,
    role,
    department_id,
    phone,
    work_location,
    employment_status,
    joining_date,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    lower(trim(p_email)),
    p_full_name,
    p_role,
    v_dept_id,
    p_phone,
    p_work_location,
    'active',
    current_date,
    now(),
    now()
  )
  on conflict (email) do update
  set user_id = v_user_id,
      full_name = p_full_name,
      role = p_role,
      department_id = coalesce(v_dept_id, public.profiles.department_id),
      phone = coalesce(p_phone, public.profiles.phone),
      work_location = coalesce(p_work_location, public.profiles.work_location),
      updated_at = now();

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', lower(trim(p_email)),
    'department_id', v_dept_id
  );
end;
$$;

-- Grant execution permission to authenticated users (and anon for bootstrapping if needed)
grant execute on function public.create_employee_account to authenticated;
grant execute on function public.create_employee_account to anon;
