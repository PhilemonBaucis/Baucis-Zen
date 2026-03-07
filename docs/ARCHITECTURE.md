# Baucis Zen - Architecture Diagrams

## System Overview

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Vercel)"]
        SF[Storefront<br/>Next.js 15]
        Admin[Admin Dashboard]
    end

    subgraph Mobile["Mobile (Expo)"]
        iOS[iOS App]
        Android[Android App]
    end

    subgraph Backend["Backend (Railway)"]
        API[Medusa API<br/>Port 9000]
        Redis[(Redis<br/>Cache/Queue)]
    end

    subgraph External["External Services"]
        Clerk[Clerk Auth]
        Twilio[Twilio SMS]
        R2[Cloudflare R2<br/>Images]
        Gemini[Google Gemini<br/>Translations]
        Push[Expo Push<br/>Notifications]
    end

    subgraph Database["Database (Neon)"]
        DB[(PostgreSQL<br/>Serverless)]
    end

    SF --> API
    Admin --> API
    iOS --> API
    Android --> API
    API --> DB
    API --> Redis
    API --> Clerk
    API --> Twilio
    API --> R2
    API --> Gemini
    API --> Push
```

## Checkout Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Medusa API
    participant T as Twilio
    participant N as Neon DB

    U->>F: Add to Cart
    F->>A: POST /store/cart/items
    A->>N: Save cart item

    U->>F: Go to Checkout
    F->>A: GET /store/cart

    U->>F: Enter Phone
    F->>A: POST /store/verify-phone/send
    A->>T: Send SMS code
    T-->>U: SMS with code

    U->>F: Enter Code
    F->>A: POST /store/verify-phone/check
    A->>N: Mark phone verified

    U->>F: Select Address
    U->>F: Choose COD Payment
    F->>A: POST /store/cart/complete
    A->>N: Create Order
    A-->>F: Order Confirmation
    F-->>U: Show Success Page
```

## Authentication Flow

```mermaid
flowchart LR
    subgraph Clerk
        CL[Clerk Login<br/>Google/Apple/Email]
    end

    subgraph Frontend
        FE[Next.js App]
        AC[AuthContext]
    end

    subgraph Backend
        API[Medusa API]
        WH[Webhook Handler]
    end

    subgraph Database
        DB[(Customer Table)]
    end

    CL -->|JWT Token| FE
    FE -->|Token in Header| API
    API -->|Verify Token| CL
    CL -->|Webhook: user.created| WH
    WH -->|Create Customer| DB
    API -->|Sync Customer| DB
    AC -->|Store Auth State| FE
```

## Data Model

```mermaid
erDiagram
    CUSTOMER ||--o{ ADDRESS : has
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string id PK
        string email
        string clerk_id
        json metadata
        int zen_points
        string tier
        boolean has_account
    }

    ADDRESS {
        string id PK
        string customer_id FK
        string address_name
        string first_name
        string last_name
        string address_1
        string city
        string country_code
        boolean is_default
    }

    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        string id PK
        string customer_id FK
        string status
        int total
        string payment_method
        timestamp created_at
    }

    ORDER_ITEM {
        string id PK
        string order_id FK
        string product_id FK
        int quantity
        int unit_price
    }

    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
    PRODUCT {
        string id PK
        string handle
        string title
        json translations
        int price
        int inventory_qty
    }
```

## Zen Points System

```mermaid
flowchart TD
    subgraph Earning["Earning Points"]
        O[Order Placed] -->|Event| S[zen-points-award.ts]
        O -->|Fallback| API[/store/zen-points/award]
        S -->|+10 points per €1| P[Update Customer Points]
        API -->|+10 points per €1| P
        G[Memory Game Win] -->|+10 points daily| P
        A[Account Created] -->|+50 signup bonus| P
    end

    subgraph Tiers["Tier Discounts"]
        P --> T{Check Balance}
        T -->|0-99| Seed[Seed: 0%]
        T -->|100-249| Sprout[Sprout: 5%]
        T -->|250-499| Blossom[Blossom: 10%]
        T -->|500+| Lotus[Lotus: 15%]
    end

    subgraph Checkout["Discount Applied"]
        Tiers --> D[Apply % to Products]
        D --> |Shipping excluded| Total[Final Total]
    end

    subgraph Reset["Monthly Reset"]
        R[30-day Cycle] -->|Check activity| RS[zen-points-reset.ts]
        RS -->|Reset if inactive| P
    end
```

## Zen Points Award Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Medusa API
    participant S as Subscriber
    participant DB as Neon DB

    Note over U,DB: Order Placement
    U->>F: Complete Checkout
    F->>A: POST /store/cart/complete
    A->>DB: Create Order
    A-->>F: Order Created

    Note over A,DB: Subscriber (may not trigger)
    A->>S: order.placed event
    S->>DB: Award Points

    Note over F,DB: Fallback (always runs)
    F->>A: POST /store/zen-points/award
    A->>DB: Check last_order_id
    alt Points not yet awarded
        A->>DB: Update zen_points
        A-->>F: points_awarded: N
    else Already awarded
        A-->>F: already_awarded: true
    end
    F->>F: Refresh Customer Data
```

## Product Sync Flow

```mermaid
flowchart LR
    GS[Google Sheets<br/>English Products] --> SS[sheets-sync.ts]
    SS --> GM[Google Gemini]
    GM -->|Translate to 7 langs| SS
    SS --> DB[(Neon DB<br/>Products Table)]
    SS --> R2[Cloudflare R2<br/>Product Images]
    DB --> API[Medusa API]
    API --> FE[Frontend<br/>Localized Display]
```

## Shipping Zones

```mermaid
flowchart TB
    subgraph Albania["Albania (AL)"]
        Z1[Zone 1: Tirana]
        Z2[Zone 2: Central]
        Z3[Zone 3: Remote]
    end

    subgraph Kosovo["Kosovo (XK)"]
        KS[Flat Rate]
    end

    Cart --> Calc[/store/shipping/calculate]
    Calc --> |Country = AL| Albania
    Calc --> |Country = XK| Kosovo
    Calc --> Rate[Calculate by Weight + Zone]
    Rate --> Display[Show in Checkout]
```

## Mobile App Architecture

```mermaid
flowchart TB
    subgraph App["Expo App (baucis-mobile)"]
        subgraph Screens["Screens (Expo Router)"]
            Tabs["(tabs)/<br/>Shop, Cart, Zen, Account"]
            Auth["(auth)/<br/>Sign In, Sign Up"]
            Product["products/[handle]"]
            Checkout["(checkout)/<br/>Address, Payment"]
        end

        subgraph State["State Management"]
            Zustand["Zustand Stores<br/>auth, cart, config"]
            Query["TanStack Query<br/>Products Cache"]
        end

        subgraph Lib["Libraries"]
            API["lib/api/<br/>Direct Fetch Client"]
            Trans["lib/transformers.ts"]
            Stock["lib/stock-utils.ts"]
        end
    end

    subgraph External["External"]
        ClerkSDK["@clerk/clerk-expo"]
        Backend["Medusa API"]
        SecureStore["expo-secure-store<br/>Token Storage"]
    end

    Tabs --> Zustand
    Tabs --> Query
    Auth --> ClerkSDK
    ClerkSDK --> SecureStore
    API --> Backend
    Query --> API
    Zustand --> API
```

## Mobile Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as Expo App
    participant Clerk as Clerk SDK
    participant API as Medusa API
    participant DB as Neon DB

    U->>App: Tap Sign In
    App->>Clerk: startOAuthFlow (Google/Apple)
    Clerk-->>U: OAuth Popup
    U->>Clerk: Authorize
    Clerk-->>App: Session + JWT

    App->>API: POST /store/customers/sync<br/>Authorization: Bearer JWT
    API->>Clerk: Verify Token
    Clerk-->>API: Valid + User Info
    API->>DB: Create/Update Customer
    DB-->>API: Customer + Zen Points
    API-->>App: Customer Data

    App->>App: Store in Zustand
    App->>App: Link Cart to Customer
    App-->>U: Show Account Screen
```

## Mobile State Architecture

```mermaid
flowchart LR
    subgraph Zustand["Zustand Stores"]
        AuthStore["auth-store<br/>customer, syncWithMedusa"]
        CartStore["cart-store<br/>items, addItem, checkout"]
        ConfigStore["config-store<br/>zenPoints, tiers"]
    end

    subgraph Persist["AsyncStorage"]
        CartID["baucis-cart<br/>cartId"]
        AuthData["baucis-auth<br/>customer"]
    end

    subgraph Query["TanStack Query"]
        Products["products<br/>5min stale, 24h cache"]
        Orders["orders<br/>auth required"]
    end

    AuthStore --> AuthData
    CartStore --> CartID
    Products --> |Offline Support| Query
```
