# Triage tag candidates (derived from real 90-day data)

STATUS: CANDIDATES ONLY. Human curates the final set; nothing applied to production.

## Method
- Corpus: 380 triaged recall documents (TiDB backfill), 62 substantive City Council agenda items (90d), 73 building permits within 1500m of the store (90d).
- Titan V2 embeddings (1024-dim, normalized), pure-numpy k-means run PER SOURCE GROUP to avoid recall-volume dominance (recalls: k=7 (sil 0.121), council: k=4 (sil 0.163), permits: k=4 (sil 0.362)); the labeling step merges clusters across groups into unified tags.
- Claude Haiku labeled clusters and mapped them to profile facts; merges noted below.

## Candidate tags

### food safety
- Item count in backfill: 308 (clusters [0, 1, 2, 3, 5])
- Connected profile facts: deli, snap
- Examples:
  - Ready Meals SALAD SEAFOOD CAJUN SS COLD
  - Vista MAX; Dietary Supplement, 90 Capsules
  - Clover Hill Dairy LLP, Pepper Jack Cheese Varieties

### medical/pharmaceutical recalls
- Item count in backfill: 6 (clusters [4])
- Connected profile facts: none
- Examples:
  - Baxter Issues Voluntary Nationwide Recall for One Lot of 70% Dextrose Injection
  - B. Braun Medical Inc. Issues Voluntary Nationwide Recall of 0.9% Sodium Chloride Injection
  - Brooklyn Roasting Company Pasteurized Cold Brew Concentrate

### ingredient/supplier recalls
- Item count in backfill: 52 (clusters [6])
- Connected profile facts: deli
- Examples:
  - Kettle Cuisine Recalls Marketside Tomato Bisque Soup Kit
  - Everything Sprouts, LLC Recalls Alfalfa Sprouts Due to Potential E. Coli and Salmonella Risk
  - Fromm Family Foods Voluntarily Recalls Turkey Pâté Wet Food For Dogs

### labor & pay
- Item count in backfill: 37 (clusters [9])
- Connected profile facts: employees
- Examples:
  - Amendment to the City Pay Plan
  - Portuguese Organization for Social Services and Opportunities Funding Increase
  - Agreement for Professional Consultant Services

### civic & governance
- Item count in backfill: 25 (clusters [7, 8, 10])
- Connected profile facts: none
- Examples:
  - Final Adoption of Ordinances
  - Approval of City Council Minutes
  - Response to Santa Clara County Civil Grand Jury Report

### residential construction
- Item count in backfill: 73 (clusters [11, 12, 13, 14])
- Connected profile facts: parking
- Examples:
  - Additions/Alterations: Single-Family at 860 BUCHSER WY
  - Photovoltaic: 1 & 2 Family Residential at 1278 DELMAS AV
  - New Construction: ADU Accessory Dwelling Unit at 1002 CALIFORNIA AV

## Large clusters with NO matching profile fact (possible missing facts)

None flagged.

## Curator notes (from the run, worth weighing during curation)

- No alcohol/ABC-related tag emerged: this 90-day window simply contained no
  beer/wine licensing items in council agendas. The UI design expected an
  "alcohol" tag; consider keeping it in the fixed set anyway (the profile fact
  exists and items WILL appear), or accept it is data-driven and add later.
- Same for program rules (SNAP/EBT): connected as a fact to recall tags, but no
  standalone program-rule items existed in the window (Federal Register source
  is deferred; adding it later would feed this tag).
- "food safety" covers 308 of 515 items; the UI may want it split by the
  recall sub-clusters (deli/prepared vs packaged) if one tag feels too broad.
- "medical/pharmaceutical recalls" (6 items) maps to no fact and is a
  candidate for folding into food safety as "not our shelves" noise, or for a
  new profile fact ("small health & beauty section carries OTC basics").
- "civic & governance" (25 items) is procedural council business; likely
  useful as the tag for the rejection log's "watched but not relevant" rows
  rather than something an alert would ever wear.

## Raw cluster inventory (for auditing the grouping)

- Cluster 0: 120 items, sources {'openfda_enforcement': 120}
    - UPC 25688000000 PIE PEACH MELBA 9IN                                 This is Albertson's store-made item and so
    - UPC 29477800000 Ready Meals SALAD SEAFOOD CAJUN SS COLD UPC 29477600000 SALAD SEAFOOD CAJUN FS COLD           
    - UPC 21176300000 MEAT PIE PORK 4CT SS COLD     UPC 21025900000 PIE PORK FS COLD      This is Albertson's store-
- Cluster 1: 27 items, sources {'openfda_enforcement': 27}
    - Vista MAX; Dietary Supplement, 90 Capsules. Serving Size: 4 Capsules; Distributed by: Vision of Health, Bell, 
    - Individual Unit Label (both lid and front of cup): Whole Foods Market Kitchens Minestrone Soup, VEGETARIAN NET
    - MOGO PURE MORINGA OLEIFERA CAPSULES, HERBAL SUPPLEMENT, 180 QUICK RELEASE VEGGIE CAPSULE, 100% PURE, 350 MG PE
- Cluster 2: 98 items, sources {'openfda_enforcement': 98}
    - Capuchino [image] Syrup Cone Cake The Original, Net Wt. 13 oz, packaged in a transparent and rigid plastic cla
    - Clover Hill Dairy LLP, Pepper Jack Cheese Varieties (Jalapeno Cheddar, Pepper Jack, Sizzlin Colby with Habaner
    - Rollitos de Guava [image] Guava Rolls The Original, Net Wt. 15 oz, packaged in a transparent and rigid plastic
- Cluster 3: 63 items, sources {'openfda_enforcement': 63}
    - Spring & Mulberry Lavender Rose Date-Sweetened Chocolate, Net Wt. 2.1 oz. (60g), individually packaged in a li
    - Ice Pop, D'Dioses Limon, 4 oz (85 g), with UPC 710594511836
    - .155 CRUNCHY CANNOLI GLUTEN FREE intended use: DESSERT  condition: shelf stable shelf life: 12 month  type of 
- Cluster 4: 6 items, sources {'fda_rss': 5, 'openfda_enforcement': 1}
    - Baxter Issues Voluntary Nationwide Recall for One Lot of 70% Dextrose Injection Due to Potential Presence of P
    - Baxter Issues Voluntary Nationwide Recall for Two Lots of 0.9% Sodium Chloride Injection Due to Potential Pres
    - B. Braun Medical Inc. Issues Voluntary Nationwide Recall of 0.9% Sodium Chloride Injection USP, 100 mL, in a 1
- Cluster 5: 14 items, sources {'openfda_enforcement': 14}
    - Joy Orange Lassi 16 oz.
    - Joy Plain Chaash Lassi 16 oz., 64 oz.
    - Joy Mango-Pina-Strawberry Lassi 16 oz.
- Cluster 6: 52 items, sources {'fda_rss': 15, 'openfda_enforcement': 37}
    - Kettle Cuisine Recalls Marketside Tomato Bisque Soup Kit – Sold Exclusively at Walmart Stores Because of Possi
    - Malazi 100% PURE SUDANESE SESAME Tahina G.W.: 1K.g UPC 6 224011 088244 Produced by: AL-MALAZ COMPANY FOR TRADE
    - Everything Sprouts, LLC Recalls Alfalfa Sprouts Due to Potential E. Coli and Salmonella Risk
- Cluster 7: 6 items, sources {'legistar': 6}
    - Final Adoption of Ordinances.
    - Approval of San José State University Flag Raising Sponsored by Council District 3 as a City Council Sponsored
    - Final Adoption of Ordinances.
- Cluster 8: 4 items, sources {'legistar': 4}
    - Approval of Council Committee Minutes.
    - Approval of City Council Minutes.
    - Approval of City Council Minutes.
- Cluster 9: 37 items, sources {'legistar': 37}
    - Actions Related to the San José Clean Energy SJ Cares Program Expansion.
    - Portuguese Organization for Social Services and Opportunities Funding Increase.
    - Amendment to the City Pay Plan.
- Cluster 10: 15 items, sources {'legistar': 15}
    - 2026 General Election Statewide Ballot Measures. - RECOMMEND DROP 3.3(d) PER ADMINISTRATION
    - Grant of Franchise to Tokay Energy Storage 1, LLC for Electric Services for Public Rights-of-Way. - RECOMMEND 
    - Response to the Santa Clara County Civil Grand Jury Report Entitled “Pothole Damage: Improving claims processe
- Cluster 11: 20 items, sources {'permits': 20}
    - Additions/Alterations: Single-Family at 860  BUCHSER WY  , SAN JOSE CA 95125-2401
    - Additions/Alterations: Single-Family at 1169  PINE AV  , SAN JOSE CA 95125-3457
    - ReRoof: Single-Family at 1154  GLENN AV  , SAN JOSE CA 95125-3234
- Cluster 12: 16 items, sources {'permits': 16}
    - Photovoltaic: 1 & 2 Family Residential at 1278  DELMAS AV  , SAN JOSE CA 95125-1724
    - Photovoltaic & Stationary Storage Battery: 1 & 2 Family Residential at 564  COE AV  , SAN JOSE CA 95125-1623
    - Photovoltaic: 1 & 2 Family Residential at 910  WILLOWSHIRE WY  , SAN JOSE CA 95125-2314
- Cluster 13: 4 items, sources {'permits': 4}
    - Tenant Improvement: Warehouse/Storage at 900  LONUS ST  , SAN JOSE CA 95126-3713
    - New Construction: ADU   Accessory Dwelling Unit at 1002  CALIFORNIA AV 2 , SAN JOSE CA 95125
    - New Construction: ADU   Accessory Dwelling Unit at 1301  WEAVER DR 2 , SAN JOSE CA 95125
- Cluster 14: 33 items, sources {'permits': 33}
    - Sub-Trades Only: Single-Family at 1164  FAIRVIEW AV  , SAN JOSE CA 95125-3412
    - Sub-Trades Only: Single-Family at 1299  GLENWOOD AV  , SAN JOSE CA 95125-3818
    - Sub-Trades Only: Single-Family at 1737  GLEN UNA AV  , SAN JOSE CA 95125-2529