-- AutoDNA: seed inicial com 40 carros brasileiros 2025
-- Gerado a partir de supabase/seed/cars.json
-- Re-executável (ON CONFLICT)

insert into public.cars
  (brand, model, version, year, body_type, fuel, transmission, engine_displacement, horsepower, price_fipe, fuel_consumption_city, fuel_consumption_road, seats, trunk_liters, tags)
values
  ('Chevrolet', 'Onix', 'LT 1.0', 2025, 'hatch', 'flex', 'manual', 1, 78, 89990, 11.5, 13.4, 5, 303, '{"popular","economico","primeiro-carro","urbano"}'),
  ('Chevrolet', 'Onix', 'Premier 1.0 Turbo', 2025, 'hatch', 'flex', 'automatico', 1, 116, 109990, 10.8, 12.9, 5, 303, '{"popular","completo","turbo","automatico"}'),
  ('Chevrolet', 'Onix Plus', 'Premier 1.0 Turbo', 2025, 'sedan', 'flex', 'automatico', 1, 116, 119990, 10.6, 12.8, 5, 469, '{"sedan","familia","turbo","automatico"}'),
  ('Chevrolet', 'Tracker', 'LT 1.0 Turbo', 2025, 'suv', 'flex', 'automatico', 1, 116, 139990, 10.2, 12.5, 5, 393, '{"suv","familia","turbo","automatico"}'),
  ('Chevrolet', 'Montana', 'LT 1.2 Turbo', 2025, 'pickup', 'flex', 'automatico', 1.2, 133, 149990, 9.8, 12.4, 5, 874, '{"pickup","trabalho","turbo","automatico"}'),
  ('Hyundai', 'HB20', 'Sense 1.0', 2025, 'hatch', 'flex', 'manual', 1, 80, 86990, 12, 13.8, 5, 300, '{"popular","economico","primeiro-carro","urbano"}'),
  ('Hyundai', 'HB20', 'Comfort 1.0 Turbo', 2025, 'hatch', 'flex', 'automatico', 1, 120, 104990, 11, 13.1, 5, 300, '{"popular","completo","turbo","automatico"}'),
  ('Hyundai', 'HB20S', 'Comfort 1.0 Turbo', 2025, 'sedan', 'flex', 'automatico', 1, 120, 114990, 10.8, 13, 5, 413, '{"sedan","familia","turbo","automatico"}'),
  ('Hyundai', 'Creta', 'Comfort 1.0 Turbo', 2025, 'suv', 'flex', 'automatico', 1, 120, 144990, 10.4, 12.7, 5, 422, '{"suv","familia","turbo","automatico","espacoso"}'),
  ('Hyundai', 'Creta', 'Limited 1.0 Turbo', 2025, 'suv', 'flex', 'automatico', 1, 120, 169990, 10.2, 12.5, 5, 422, '{"suv","familia","completo","premium","automatico"}'),
  ('Volkswagen', 'Polo', 'Track 1.0', 2025, 'hatch', 'flex', 'manual', 1, 84, 88990, 11.8, 13.6, 5, 300, '{"popular","economico","primeiro-carro","urbano"}'),
  ('Volkswagen', 'Polo', 'Highline 1.0 TSI', 2025, 'hatch', 'flex', 'automatico', 1, 128, 119990, 11.2, 13.4, 5, 300, '{"completo","turbo","automatico","premium"}'),
  ('Volkswagen', 'Virtus', 'Highline 1.0 TSI', 2025, 'sedan', 'flex', 'automatico', 1, 128, 129990, 11, 13.3, 5, 521, '{"sedan","familia","turbo","automatico","porta-malas-grande"}'),
  ('Volkswagen', 'T-Cross', 'Comfortline 200 TSI', 2025, 'suv', 'flex', 'automatico', 1, 128, 149990, 10.8, 13, 5, 373, '{"suv","familia","turbo","automatico","robusto"}'),
  ('Volkswagen', 'Nivus', 'Comfortline 200 TSI', 2025, 'crossover', 'flex', 'automatico', 1, 128, 134990, 11.4, 13.6, 5, 415, '{"crossover","esportivo","turbo","automatico","jovem"}'),
  ('Volkswagen', 'Taos', 'Highline 250 TSI', 2025, 'suv', 'flex', 'automatico', 1.4, 150, 199990, 9.8, 12.2, 5, 498, '{"suv","familia","premium","turbo","automatico","espacoso"}'),
  ('Volkswagen', 'Saveiro', 'Robust 1.6', 2025, 'pickup', 'flex', 'manual', 1.6, 110, 119990, 9.4, 11.8, 2, 712, '{"pickup","trabalho","economico"}'),
  ('Fiat', 'Mobi', 'Like 1.0', 2025, 'hatch', 'flex', 'manual', 1, 70, 73990, 13.2, 15, 5, 230, '{"popular","economico","primeiro-carro","urbano","compacto"}'),
  ('Fiat', 'Argo', 'Drive 1.0', 2025, 'hatch', 'flex', 'manual', 1, 75, 84990, 12.4, 14.1, 5, 300, '{"popular","economico","primeiro-carro","urbano"}'),
  ('Fiat', 'Cronos', 'Drive 1.3', 2025, 'sedan', 'flex', 'manual', 1.3, 99, 99990, 11.5, 13.4, 5, 525, '{"sedan","familia","economico","porta-malas-grande"}'),
  ('Fiat', 'Pulse', 'Drive 1.3', 2025, 'suv', 'flex', 'automatizado', 1.3, 107, 114990, 10.8, 12.6, 5, 370, '{"suv","compacto","urbano","automatico"}'),
  ('Fiat', 'Fastback', 'Audace 1.0 Turbo', 2025, 'suv', 'flex', 'automatico', 1, 130, 154990, 10.6, 12.8, 5, 600, '{"suv","cupe","turbo","automatico","porta-malas-grande"}'),
  ('Fiat', 'Strada', 'Endurance 1.4', 2025, 'pickup', 'flex', 'manual', 1.4, 88, 99990, 10.4, 12.8, 2, 844, '{"pickup","trabalho","economico","popular"}'),
  ('Fiat', 'Toro', 'Freedom 1.3 Turbo', 2025, 'pickup', 'flex', 'automatico', 1.3, 180, 184990, 8.8, 11.2, 5, 937, '{"pickup","familia","turbo","automatico","robusto"}'),
  ('Renault', 'Kwid', 'Zen 1.0', 2025, 'hatch', 'flex', 'manual', 1, 71, 71990, 13.6, 15.2, 5, 290, '{"popular","economico","primeiro-carro","urbano","compacto"}'),
  ('Peugeot', '208', 'Active 1.0', 2025, 'hatch', 'flex', 'manual', 1, 75, 89990, 12.2, 14, 5, 311, '{"popular","economico","urbano","estiloso"}'),
  ('Toyota', 'Yaris', 'XL 1.5', 2025, 'hatch', 'flex', 'manual', 1.5, 110, 99990, 11.8, 13.8, 5, 286, '{"confiavel","economico","primeiro-carro"}'),
  ('Toyota', 'Yaris Sedan', 'XL Plus 1.5', 2025, 'sedan', 'flex', 'cvt', 1.5, 110, 119990, 12, 14.2, 5, 473, '{"sedan","familia","confiavel","economico","automatico"}'),
  ('Toyota', 'Corolla', 'XEi 2.0', 2025, 'sedan', 'flex', 'cvt', 2, 177, 179990, 11.5, 14.5, 5, 470, '{"sedan","premium","confiavel","executivo","automatico"}'),
  ('Toyota', 'Corolla Cross', 'XR 2.0', 2025, 'suv', 'flex', 'cvt', 2, 177, 199990, 11, 13.9, 5, 440, '{"suv","premium","familia","confiavel","automatico","espacoso"}'),
  ('Toyota', 'Corolla Cross', 'XRX Hybrid 1.8', 2025, 'suv', 'hibrido', 'cvt', 1.8, 122, 234990, 18.5, 18.2, 5, 440, '{"suv","hibrido","premium","familia","economico","automatico","sustentavel"}'),
  ('Toyota', 'Hilux', 'SR 2.8 Diesel 4x4', 2025, 'pickup', 'diesel', 'automatico', 2.8, 204, 279990, 8.5, 10.8, 5, 1060, '{"pickup","diesel","4x4","trabalho","robusto","premium"}'),
  ('Honda', 'Civic', 'Touring 2.0 Hybrid e:HEV', 2025, 'sedan', 'hibrido', 'cvt', 2, 184, 259990, 16.8, 17.2, 5, 410, '{"sedan","hibrido","premium","executivo","economico","automatico","sustentavel"}'),
  ('Honda', 'HR-V', 'EXL 1.5', 2025, 'suv', 'flex', 'cvt', 1.5, 126, 174990, 11.2, 13.6, 5, 354, '{"suv","familia","confiavel","automatico","premium"}'),
  ('Nissan', 'Versa', 'Sense 1.6', 2025, 'sedan', 'flex', 'cvt', 1.6, 114, 114990, 11.4, 14, 5, 482, '{"sedan","familia","economico","automatico","porta-malas-grande"}'),
  ('Jeep', 'Renegade', 'Longitude 1.3 Turbo', 2025, 'suv', 'flex', 'automatico', 1.3, 180, 154990, 9.6, 12.2, 5, 320, '{"suv","robusto","turbo","automatico","aventura"}'),
  ('Jeep', 'Compass', 'Longitude 1.3 Turbo', 2025, 'suv', 'flex', 'automatico', 1.3, 185, 199990, 9.4, 12, 5, 438, '{"suv","familia","premium","turbo","automatico","espacoso"}'),
  ('Caoa Chery', 'Tiggo 5X', 'Pro 1.5 Turbo', 2025, 'suv', 'flex', 'cvt', 1.5, 147, 139990, 9.8, 12.4, 5, 360, '{"suv","familia","completo","turbo","automatico","custo-beneficio"}'),
  ('Caoa Chery', 'Tiggo 7', 'Pro 1.6 Turbo', 2025, 'suv', 'gasolina', 'automatico', 1.6, 187, 174990, 8.6, 11.4, 5, 475, '{"suv","familia","premium","turbo","automatico","espacoso","custo-beneficio"}'),
  ('GWM', 'Haval H6', 'HEV 1.5T', 2025, 'suv', 'hibrido', 'automatico', 1.5, 243, 219990, 15.4, 16, 5, 560, '{"suv","hibrido","premium","familia","automatico","espacoso","sustentavel","tecnologia"}')
on conflict (brand, model, version, year) do update set
  body_type = excluded.body_type,
  fuel = excluded.fuel,
  transmission = excluded.transmission,
  engine_displacement = excluded.engine_displacement,
  horsepower = excluded.horsepower,
  price_fipe = excluded.price_fipe,
  fuel_consumption_city = excluded.fuel_consumption_city,
  fuel_consumption_road = excluded.fuel_consumption_road,
  seats = excluded.seats,
  trunk_liters = excluded.trunk_liters,
  tags = excluded.tags;

insert into public.car_costs (car_id, insurance_yearly, maintenance_yearly, ipva_yearly, depreciation_yearly)
    select id, 4200, 1800, 3600, 10800 from public.cars where brand='Chevrolet' and model='Onix' and version='LT 1.0' and year=2025
    union all
    select id, 5100, 2200, 4400, 13200 from public.cars where brand='Chevrolet' and model='Onix' and version='Premier 1.0 Turbo' and year=2025
    union all
    select id, 5400, 2300, 4800, 14400 from public.cars where brand='Chevrolet' and model='Onix Plus' and version='Premier 1.0 Turbo' and year=2025
    union all
    select id, 5600, 2600, 5600, 16800 from public.cars where brand='Chevrolet' and model='Tracker' and version='LT 1.0 Turbo' and year=2025
    union all
    select id, 5400, 2700, 6000, 18000 from public.cars where brand='Chevrolet' and model='Montana' and version='LT 1.2 Turbo' and year=2025
    union all
    select id, 4100, 1700, 3480, 10440 from public.cars where brand='Hyundai' and model='HB20' and version='Sense 1.0' and year=2025
    union all
    select id, 4900, 2100, 4200, 12600 from public.cars where brand='Hyundai' and model='HB20' and version='Comfort 1.0 Turbo' and year=2025
    union all
    select id, 5200, 2200, 4600, 13800 from public.cars where brand='Hyundai' and model='HB20S' and version='Comfort 1.0 Turbo' and year=2025
    union all
    select id, 5800, 2700, 5800, 17400 from public.cars where brand='Hyundai' and model='Creta' and version='Comfort 1.0 Turbo' and year=2025
    union all
    select id, 6500, 3000, 6800, 20400 from public.cars where brand='Hyundai' and model='Creta' and version='Limited 1.0 Turbo' and year=2025
    union all
    select id, 4200, 1900, 3560, 10680 from public.cars where brand='Volkswagen' and model='Polo' and version='Track 1.0' and year=2025
    union all
    select id, 5400, 2400, 4800, 14400 from public.cars where brand='Volkswagen' and model='Polo' and version='Highline 1.0 TSI' and year=2025
    union all
    select id, 5600, 2500, 5200, 15600 from public.cars where brand='Volkswagen' and model='Virtus' and version='Highline 1.0 TSI' and year=2025
    union all
    select id, 6000, 2800, 6000, 18000 from public.cars where brand='Volkswagen' and model='T-Cross' and version='Comfortline 200 TSI' and year=2025
    union all
    select id, 5800, 2600, 5400, 16200 from public.cars where brand='Volkswagen' and model='Nivus' and version='Comfortline 200 TSI' and year=2025
    union all
    select id, 7500, 3500, 8000, 24000 from public.cars where brand='Volkswagen' and model='Taos' and version='Highline 250 TSI' and year=2025
    union all
    select id, 4800, 2200, 4800, 14400 from public.cars where brand='Volkswagen' and model='Saveiro' and version='Robust 1.6' and year=2025
    union all
    select id, 3600, 1500, 2960, 8880 from public.cars where brand='Fiat' and model='Mobi' and version='Like 1.0' and year=2025
    union all
    select id, 4000, 1700, 3400, 10200 from public.cars where brand='Fiat' and model='Argo' and version='Drive 1.0' and year=2025
    union all
    select id, 4600, 2000, 4000, 12000 from public.cars where brand='Fiat' and model='Cronos' and version='Drive 1.3' and year=2025
    union all
    select id, 5200, 2300, 4600, 13800 from public.cars where brand='Fiat' and model='Pulse' and version='Drive 1.3' and year=2025
    union all
    select id, 6200, 2700, 6200, 18600 from public.cars where brand='Fiat' and model='Fastback' and version='Audace 1.0 Turbo' and year=2025
    union all
    select id, 4400, 2000, 4000, 12000 from public.cars where brand='Fiat' and model='Strada' and version='Endurance 1.4' and year=2025
    union all
    select id, 7000, 3200, 7400, 22200 from public.cars where brand='Fiat' and model='Toro' and version='Freedom 1.3 Turbo' and year=2025
    union all
    select id, 3500, 1500, 2880, 8640 from public.cars where brand='Renault' and model='Kwid' and version='Zen 1.0' and year=2025
    union all
    select id, 4200, 1900, 3600, 10800 from public.cars where brand='Peugeot' and model='208' and version='Active 1.0' and year=2025
    union all
    select id, 4500, 1800, 4000, 9500 from public.cars where brand='Toyota' and model='Yaris' and version='XL 1.5' and year=2025
    union all
    select id, 4900, 2000, 4800, 11400 from public.cars where brand='Toyota' and model='Yaris Sedan' and version='XL Plus 1.5' and year=2025
    union all
    select id, 6800, 2800, 7200, 18000 from public.cars where brand='Toyota' and model='Corolla' and version='XEi 2.0' and year=2025
    union all
    select id, 7400, 3000, 8000, 20000 from public.cars where brand='Toyota' and model='Corolla Cross' and version='XR 2.0' and year=2025
    union all
    select id, 8400, 3000, 9400, 21150 from public.cars where brand='Toyota' and model='Corolla Cross' and version='XRX Hybrid 1.8' and year=2025
    union all
    select id, 9800, 4500, 11200, 25200 from public.cars where brand='Toyota' and model='Hilux' and version='SR 2.8 Diesel 4x4' and year=2025
    union all
    select id, 9200, 3200, 10400, 23400 from public.cars where brand='Honda' and model='Civic' and version='Touring 2.0 Hybrid e:HEV' and year=2025
    union all
    select id, 6600, 2800, 7000, 17500 from public.cars where brand='Honda' and model='HR-V' and version='EXL 1.5' and year=2025
    union all
    select id, 4800, 2100, 4600, 12000 from public.cars where brand='Nissan' and model='Versa' and version='Sense 1.6' and year=2025
    union all
    select id, 6200, 2900, 6200, 18600 from public.cars where brand='Jeep' and model='Renegade' and version='Longitude 1.3 Turbo' and year=2025
    union all
    select id, 7600, 3500, 8000, 24000 from public.cars where brand='Jeep' and model='Compass' and version='Longitude 1.3 Turbo' and year=2025
    union all
    select id, 6000, 2700, 5600, 18200 from public.cars where brand='Caoa Chery' and model='Tiggo 5X' and version='Pro 1.5 Turbo' and year=2025
    union all
    select id, 6800, 3000, 7000, 22750 from public.cars where brand='Caoa Chery' and model='Tiggo 7' and version='Pro 1.6 Turbo' and year=2025
    union all
    select id, 8200, 3000, 8800, 26400 from public.cars where brand='GWM' and model='Haval H6' and version='HEV 1.5T' and year=2025
on conflict (car_id) do update set
  insurance_yearly = excluded.insurance_yearly,
  maintenance_yearly = excluded.maintenance_yearly,
  ipva_yearly = excluded.ipva_yearly,
  depreciation_yearly = excluded.depreciation_yearly;
