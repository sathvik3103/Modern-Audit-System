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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```