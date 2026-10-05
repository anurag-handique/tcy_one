-- =====================================================================
-- TCY WorkHub — Production Bootstrap Seed (No Dummy Data)
-- =====================================================================

-- 1. Standard HR Leave Types
insert into public.leave_types (name, code, default_days, is_paid, description) values
('Casual Leave', 'CL', 12, true, 'Standard short personal time off'),
('Sick Leave', 'SL', 8, true, 'Medical illness and recovery leave'),
('Earned Leave', 'EL', 15, true, 'Annual vacation and earned rest'),
('Compensatory Off', 'CO', 0, true, 'Compensatory off for weekend or overtime shifts')
on conflict (code) do nothing;

-- 2. Official 2026 Holidays
insert into public.holidays (name, holiday_date, is_optional, description, year) values
('New Year''s Day', '2026-01-01', false, 'Official New Year Holiday', 2026),
('Republic Day', '2026-01-26', false, 'National Holiday', 2026),
('Independence Day', '2026-08-15', false, 'National Holiday', 2026),
('Gandhi Jayanti', '2026-10-02', false, 'National Holiday', 2026),
('Diwali (Deepavali)', '2026-11-08', false, 'Festival of Lights', 2026),
('Christmas', '2026-12-25', false, 'Christmas Holiday', 2026)
on conflict (holiday_date) do nothing;
