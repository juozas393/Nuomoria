-- Migration: Amenities System
-- Purpose: Create amenities table with search/create functionality and property junction table

-- ============================================================================
-- 0. ENABLE pg_trgm EXTENSION FOR FUZZY SEARCH (must be before indexes)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. CREATE AMENITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom',
    is_custom BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for search
CREATE INDEX IF NOT EXISTS idx_amenities_name_search ON public.amenities USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_amenities_category ON public.amenities(category);
CREATE INDEX IF NOT EXISTS idx_amenities_key ON public.amenities(key);

-- ============================================================================
-- 2. CREATE PROPERTY_AMENITIES JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.property_amenities (
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (property_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS idx_property_amenities_property ON public.property_amenities(property_id);
CREATE INDEX IF NOT EXISTS idx_property_amenities_amenity ON public.property_amenities(amenity_id);

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;

-- Amenities: Everyone can read, authenticated users can create custom
DROP POLICY IF EXISTS "amenities_select" ON public.amenities;
CREATE POLICY "amenities_select" ON public.amenities
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "amenities_insert" ON public.amenities;
CREATE POLICY "amenities_insert" ON public.amenities
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        is_custom = true AND
        created_by = auth.uid()
    );

-- Property amenities: Access based on property ownership
DROP POLICY IF EXISTS "property_amenities_select" ON public.property_amenities;
CREATE POLICY "property_amenities_select" ON public.property_amenities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = property_id
            AND (
                p.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.user_addresses ua
                    WHERE ua.address_id = p.address_id
                    AND ua.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "property_amenities_insert" ON public.property_amenities;
CREATE POLICY "property_amenities_insert" ON public.property_amenities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = property_id
            AND (
                p.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.user_addresses ua
                    WHERE ua.address_id = p.address_id
                    AND ua.user_id = auth.uid()
                    AND ua.role = 'landlord'
                )
            )
        )
    );

DROP POLICY IF EXISTS "property_amenities_delete" ON public.property_amenities;
CREATE POLICY "property_amenities_delete" ON public.property_amenities
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = property_id
            AND (
                p.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.user_addresses ua
                    WHERE ua.address_id = p.address_id
                    AND ua.user_id = auth.uid()
                    AND ua.role = 'landlord'
                )
            )
        )
    );

-- ============================================================================
-- 4. SEED DEFAULT AMENITIES
-- ============================================================================
INSERT INTO public.amenities (key, name, category, is_custom) VALUES
    -- Kitchen (basic)
    ('fridge', 'Šaldytuvas', 'kitchen', false),
    ('stove', 'Viryklė', 'kitchen', false),
    ('oven', 'Orkaitė', 'kitchen', false),
    ('microwave', 'Mikrobangos', 'kitchen', false),
    ('dishwasher', 'Indaplovė', 'kitchen', false),
    -- Kitchen (extended)
    ('kettle', 'Virdulys', 'kitchen', false),
    ('coffee_machine', 'Kavos aparatas', 'kitchen', false),
    ('espresso_machine', 'Espreso aparatas', 'kitchen', false),
    ('toaster', 'Skrudintuvai', 'kitchen', false),
    ('freezer', 'Šaldiklis', 'kitchen', false),
    ('blender', 'Trintuvas', 'kitchen', false),
    ('mixer', 'Maišytuvas', 'kitchen', false),
    ('food_processor', 'Virtuvės kombainas', 'kitchen', false),
    ('rice_cooker', 'Ryžių viryklė', 'kitchen', false),
    ('slow_cooker', 'Lėtpuodis', 'kitchen', false),
    ('pressure_cooker', 'Slėginis puodas', 'kitchen', false),
    ('air_fryer', 'Karšto oro gruzdintuvė', 'kitchen', false),
    ('water_filter', 'Vandens filtras', 'kitchen', false),
    ('garbage_disposal', 'Atliekų smulkintuvas', 'kitchen', false),
    ('wine_fridge', 'Vyno šaldytuvas', 'kitchen', false),
    ('kitchen_island', 'Virtuvės sala', 'kitchen', false),
    ('exhaust_hood', 'Gartraukis', 'kitchen', false),
    ('induction_stove', 'Indukcinė viryklė', 'kitchen', false),
    ('juicer', 'Sulčiaspaudė', 'kitchen', false),
    ('electric_griddle', 'Elektrinė keptuvė', 'kitchen', false),
    ('sandwich_maker', 'Sumuštinių keptuvas', 'kitchen', false),
    ('waffle_maker', 'Vaflių keptuvas', 'kitchen', false),
    -- Appliances (basic)
    ('washing_machine', 'Skalbyklė', 'appliances', false),
    ('tv', 'Televizorius', 'appliances', false),
    ('air_conditioning', 'Kondicionierius', 'appliances', false),
    -- Appliances (extended)
    ('dryer', 'Džiovyklė', 'appliances', false),
    ('vacuum', 'Dulkių siurblys', 'appliances', false),
    ('robot_vacuum', 'Robotas siurblys', 'appliances', false),
    ('iron', 'Lygintuvas', 'appliances', false),
    ('ironing_board', 'Lyginimo lenta', 'appliances', false),
    ('hair_dryer', 'Plaukų džiovintuvas', 'appliances', false),
    ('curling_iron', 'Plaukų žnyplės', 'appliances', false),
    ('hair_straightener', 'Plaukų tiesintuvas', 'appliances', false),
    ('smart_tv', 'Smart TV', 'appliances', false),
    ('projector', 'Projektorius', 'appliances', false),
    ('sound_system', 'Garso sistema', 'appliances', false),
    ('gaming_console', 'Žaidimų konsolė', 'appliances', false),
    ('dehumidifier', 'Sausintuvas', 'appliances', false),
    ('humidifier', 'Drėkintuvas', 'appliances', false),
    ('air_purifier', 'Oro valytuvas', 'appliances', false),
    ('fan', 'Ventiliatorius', 'appliances', false),
    ('heater', 'Šildytuvas', 'appliances', false),
    ('steam_cleaner', 'Garinis valytuvas', 'appliances', false),
    ('garment_steamer', 'Drabužių garintuvas', 'appliances', false),
    ('electric_blanket', 'Elektrinė antklodė', 'appliances', false),
    ('sewing_machine', 'Siuvimo mašina', 'appliances', false),
    -- Building (basic)
    ('elevator', 'Liftas', 'building', false),
    ('internet', 'Internetas', 'building', false),
    -- Building (extended)
    ('high_speed_internet', 'Greitas internetas', 'building', false),
    ('fiber_optic', 'Šviesolaidinis internetas', 'building', false),
    ('security', 'Apsauga', 'building', false),
    ('intercom', 'Domofonas', 'building', false),
    ('video_intercom', 'Vaizdo domofonas', 'building', false),
    ('cctv', 'Vaizdo stebėjimas', 'building', false),
    ('concierge', 'Administratorius', 'building', false),
    ('doorman', 'Durininkas', 'building', false),
    ('wheelchair_access', 'Pritaikyta neįgaliesiems', 'building', false),
    ('cargo_elevator', 'Krovinis liftas', 'building', false),
    ('mail_room', 'Pašto dėžutės', 'building', false),
    ('package_locker', 'Siuntų spintelės', 'building', false),
    ('recycling', 'Rūšiavimo konteineriai', 'building', false),
    ('trash_chute', 'Šiukšlių vamzdis', 'building', false),
    ('fire_alarm', 'Priešgaisrinė signalizacija', 'building', false),
    ('generator', 'Generatorius', 'building', false),
    ('gym', 'Sporto salė', 'building', false),
    ('swimming_pool', 'Baseinas pastate', 'building', false),
    ('spa', 'SPA zona', 'building', false),
    ('coworking', 'Bendradarbystės erdvė', 'building', false),
    ('rooftop_access', 'Prieiga prie stogo', 'building', false),
    ('laundry_room', 'Skalbykla pastate', 'building', false),
    ('storage_room', 'Sandėliukas', 'building', false),
    -- Comfort (basic)
    ('heating', 'Centrinis šildymas', 'comfort', false),
    ('hot_water', 'Karštas vanduo', 'comfort', false),
    -- Comfort (extended)
    ('floor_heating', 'Grindų šildymas', 'comfort', false),
    ('fireplace', 'Židinys', 'comfort', false),
    ('electric_fireplace', 'Elektrinis židinys', 'comfort', false),
    ('jacuzzi', 'Džiakuzi', 'comfort', false),
    ('sauna', 'Sauna', 'comfort', false),
    ('steam_room', 'Garų kambarys', 'comfort', false),
    ('pool', 'Baseinas', 'comfort', false),
    ('smart_home', 'Išmanusis namas', 'comfort', false),
    ('smart_thermostat', 'Išmanusis termostatas', 'comfort', false),
    ('smart_lighting', 'Išmanusis apšvietimas', 'comfort', false),
    ('blackout_curtains', 'Užtemdančios užuolaidos', 'comfort', false),
    ('electric_blinds', 'Elektrinės žaliuzės', 'comfort', false),
    ('soundproofing', 'Garso izoliacija', 'comfort', false),
    ('double_glazing', 'Dvigubi langai', 'comfort', false),
    ('triple_glazing', 'Trigubi langai', 'comfort', false),
    ('heated_bathroom_floor', 'Šildomos vonios grindys', 'comfort', false),
    ('towel_warmer', 'Rankšluosčių džiovintuvas', 'comfort', false),
    ('bidet', 'Bidė', 'comfort', false),
    ('walk_in_shower', 'Dušo kabina', 'comfort', false),
    ('bathtub', 'Vonia', 'comfort', false),
    ('heated_toilet_seat', 'Šildoma tualeto sėdynė', 'comfort', false),
    ('rain_shower', 'Lietaus dušas', 'comfort', false),
    ('music_system', 'Integruota garso sistema', 'comfort', false),
    ('aromatherapy', 'Aromaterapijos difuzorius', 'comfort', false),
    ('meditation_room', 'Meditacijos kambarys', 'comfort', false),
    -- Outdoor (basic)
    ('balcony_furniture', 'Balkono baldai', 'outdoor', false),
    ('grill', 'Grilis', 'outdoor', false),
    -- Outdoor (extended)
    ('garden', 'Sodas', 'outdoor', false),
    ('terrace', 'Terasa', 'outdoor', false),
    ('rooftop_terrace', 'Stogo terasa', 'outdoor', false),
    ('patio', 'Kiemo aikštelė', 'outdoor', false),
    ('playground', 'Vaikų aikštelė', 'outdoor', false),
    ('bike_storage', 'Dviračių saugykla', 'outdoor', false),
    ('private_garden', 'Privatus sodas', 'outdoor', false),
    ('shared_garden', 'Bendras sodas', 'outdoor', false),
    ('outdoor_furniture', 'Lauko baldai', 'outdoor', false),
    ('hammock', 'Hamakas', 'outdoor', false),
    ('outdoor_shower', 'Lauko dušas', 'outdoor', false),
    ('bbq_area', 'Kepsninės zona', 'outdoor', false),
    ('fire_pit', 'Laužavietė', 'outdoor', false),
    ('hot_tub', 'Karšta vonia', 'outdoor', false),
    ('gazebo', 'Pavėsinė', 'outdoor', false),
    ('pergola', 'Pergolė', 'outdoor', false),
    ('greenhouse', 'Šiltnamis', 'outdoor', false),
    ('pool_loungers', 'Baseino gultai', 'outdoor', false),
    ('trampoline', 'Batutas', 'outdoor', false),
    ('orchard', 'Vaismedžių sodas', 'outdoor', false),
    ('herb_garden', 'Prieskonių darželis', 'outdoor', false),
    ('chicken_coop', 'Vištidė', 'outdoor', false),
    ('pond', 'Tvenkinys', 'outdoor', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ROLLBACK:
-- DROP TABLE IF EXISTS public.property_amenities;
-- DROP TABLE IF EXISTS public.amenities;
-- ============================================================================
