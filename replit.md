# Intelligent Audit Prioritization System

## Overview

This application is an intelligent audit prioritization system designed for ABCD Auditing to modernize their manual Excel-based corporate file review process. The system applies configurable business rules to flag companies in the confectionary sector that may warrant further investigation, providing transparent reasoning and explainable decision-making capabilities.

The application follows a full-stack architecture with a React frontend, Express.js backend, and PostgreSQL database integration through Drizzle ORM. It implements a comprehensive audit flagging system with rule-based logic, data visualization, and AI-assisted explanations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom audit-specific color palette
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful APIs with structured error handling
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Development**: Hot reload with middleware integration

### Data Layer
- **Database**: PostgreSQL with Drizzle schema definitions
- **Connection**: Neon Database serverless driver
- **Migrations**: Drizzle Kit for schema management
- **Storage**: Dual storage strategy with in-memory fallback and database persistence

## Key Components

### Audit Rule Engine
The system implements a configurable rule engine that evaluates companies based on:
- **Bubblegum Tax Threshold**: Flags companies with bubblegum tax > $50,000
- **Audit Recency**: Identifies companies not audited within 3 years
- **Sales Tax Percentage**: Dynamic threshold filtering (5%, 10%, 15%)
- **Data Consistency**: Detects missing salary or revenue data inconsistencies

### Risk Assessment System
- **Risk Levels**: High, Medium, Low categorization
- **Severity Scoring**: Weighted flag importance
- **Risk Aggregation**: Multiple flag combinations for comprehensive assessment

### Explainability Features
- **Detailed Explanations**: Company-specific flagging reasons
- **Business Rule Transparency**: Clear rule application logic
- **AI-Assisted Q&A**: Natural language explanations for audit decisions
- **Rationale Generation**: Automated reasoning summaries

### Data Management
- **Bulk Data Upload**: JSON-based data import with validation
- **Sample Data Integration**: Pre-loaded confectionary sector companies
- **Export Capabilities**: CSV export for audit workflows
- **Data Validation**: Schema validation and consistency checks

## Data Flow

1. **Data Ingestion**: Companies and audit data loaded via upload dialog or sample dataset
2. **Rule Application**: Configurable audit rules applied to company dataset
3. **Flag Generation**: Business logic generates flags with severity levels
4. **Risk Assessment**: Flags aggregated into risk scores and levels
5. **Presentation**: Flagged companies displayed with sortable, filterable interface
6. **Explanation**: On-demand detailed explanations for flagging decisions
7. **Export**: Results exported for audit workflow integration

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless database connection
- **drizzle-orm**: Type-safe database operations and schema management
- **@tanstack/react-query**: Server state management and caching
- **express**: Backend web framework with middleware support

### UI Dependencies
- **@radix-ui/react-***: Headless UI primitives for accessibility
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Consistent icon library
- **class-variance-authority**: Type-safe CSS class management

### Development Dependencies
- **vite**: Fast build tool with HMR support
- **typescript**: Type safety across frontend and backend
- **drizzle-kit**: Database schema management and migrations

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with Express.js backend
- **Hot Reloading**: Automatic refresh for both frontend and backend changes
- **Database**: Development database with sample data initialization
- **Error Handling**: Runtime error overlays and comprehensive logging

### Production Deployment
- **Build Process**: Vite production build with Express.js bundling via esbuild
- **Static Assets**: Optimized frontend assets served from Express
- **Database**: PostgreSQL production instance with migrations
- **Environment Variables**: Secure configuration for database connections

### Scalability Considerations
- **Database Indexing**: Optimized queries for large company datasets
- **Caching**: React Query caching for improved performance
- **Modular Architecture**: Extensible rule engine for future enhancements
- **API Versioning**: Structured for future API evolution

## Changelog

```
Changelog:
- July 02, 2025. Initial setup
- July 02, 2025. Enhanced export functionality with dual CSV/PDF options
  * Added dropdown export menu with CSV and PDF format selection
  * Implemented comprehensive CSV export with all financial data columns and human-readable flags
  * Created professional PDF reports with dashboard-style layout and AI insights
  * Used jsPDF for reliable PDF generation with proper formatting and multi-page support
- July 03, 2025. Implemented Step 4: ML-Based Anomaly Detection
  * Added unsupervised machine learning using Isolation Forest and Local Outlier Factor
  * Implemented LIME explanations for model interpretability 
  * Created Python ML service with subprocess integration
  * Added configurable ML parameters with user-friendly explanations
  * Built comprehensive ML analysis page with feature importance and LIME explanations
  * Added navigation from Step 3 (Rule-based audit) to Step 4 (ML analysis)
  * Supports separate CSV export for ML findings
- July 03, 2025. Enhanced ML Analysis PDF Export
  * Added comprehensive PDF export functionality with professional BI dashboard design
  * Fixed detection method display to show "Combined (Isolation Forest + LOF)" correctly
  * Integrated complete LIME explanations for each anomaly including AI summaries, prediction probabilities, and feature contributions
  * Implemented colorful visual elements with proper data display (executive summary cards, feature importance bars, probability visualizations)
  * Created multi-page layout with detailed individual analysis for each detected anomaly
  * Includes auditor feedback integration and session tracking for comprehensive reporting
- July 03, 2025. Comprehensive Session State Management Implementation
  * Created SessionContext with React Context API for global state management
  * Added localStorage persistence for all form inputs and user selections across all four steps
  * Step 1 (Data Upload): Tracks upload data, completion status, and file information
  * Step 2 (Data Exploration): Preserves navigation state and step progression
  * Step 3 (Audit Dashboard): Persists all audit rules configuration and thresholds
  * Step 4 (ML Analysis): Maintains ML parameters (contamination, neighbors, threshold) between sessions
  * Fixed infinite re-render issues with optimized useEffect dependencies
  * User confirmed perfect data consistency when switching between steps
- July 03, 2025. Advanced Table Filtering with Export Synchronization
  * Implemented comprehensive table filtering system for flagged corporate files
  * Added multi-criteria filtering: risk levels (High/Medium/Low), risk score ranges, flag types, and audit status
  * Created interactive filter popover with real-time updates and active filter counter
  * Synchronized export functionality (CSV/PDF) with applied table filters
  * Export now respects filtered view - only exports visible companies instead of all flagged companies
  * User confirmed filtering and export synchronization working perfectly
- July 03, 2025. Enhanced ML Method Explanations and Transparency
  * Added comprehensive "How It Works" expandable panel in ML Analysis Configuration
  * Implemented detailed explanations for Isolation Forest and LOF algorithms with non-technical language
  * Enhanced parameter explanations with practical examples and recommendations
  * Created algorithm overview section explaining what each method detects and when to use them
  * Added visual indicators and color coding for different ML concepts
  * Enhanced Feature Importance section with business context and usage guidelines
  * Improved LIME explanation modal with clear interpretation guides
  * Made ML system more transparent and accessible to both technical and non-technical users
- July 03, 2025. Custom Business Rules Feature Implementation
  * Implemented comprehensive custom rules system for Step 3 audit dashboard
  * Created database schema with custom rules table and session-based storage
  * Built custom rule builder with field selection, operator choices, and value input
  * Developed custom rules management panel with create, edit, delete, and toggle functionality
  * Enhanced rule evaluation engine to use user-provided rule names as flag types
  * Improved flag display system with gradient styling and "Custom" badges for user-created rules
  * Added session persistence for custom rules with automatic cache invalidation
  * Custom rules now work seamlessly with existing audit flagging system and export functionality
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```