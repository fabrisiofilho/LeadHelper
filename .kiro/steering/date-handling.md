---
inclusion: fileMatch
fileMatchPattern: '**/*repository*,**/*service*,**/*entity*,**/date*'
---

# Padrão de Tratamento de Datas (SQLite + TypeORM)

## Regra de ouro

**NUNCA passe um objeto `new Date()` diretamente para FindOperators do TypeORM** (`LessThanOrEqual`, `MoreThanOrEqual`, `Between`).

O TypeORM NÃO aplica o column transformer nos valores de FindOperators. Objetos Date são serializados como ISO strings completas (`2026-02-24T18:30:00.000Z`), quebrando comparações contra valores `YYYY-MM-DD` no SQLite.

## Como fazer

Usar os helpers centralizados de `@main/infrastructure/utils/date-utils`:

```typescript
import { dateLte, dateGte, dateGteOrNull, toDateString } from '@main/infrastructure/utils/date-utils';

// Em queries com find() / where:
where: {
  startDate: dateLte(endDate),      // startDate <= endDate (como string)
  endDate: dateGte(startDate),      // endDate >= startDate (como string)
  endDate: dateGteOrNull(date),     // endDate >= date OR endDate IS NULL
}

// Em queries com createQueryBuilder:
.where('entity.start_date <= :date', { date: toDateString(myDate) })
```

## Helpers disponíveis

| Helper                    | Uso                         | Equivale a                   |
| ------------------------- | --------------------------- | ---------------------------- |
| `dateLte(date)`           | `find({ where })`           | `LessThanOrEqual` com string |
| `dateGte(date)`           | `find({ where })`           | `MoreThanOrEqual` com string |
| `dateBetween(start, end)` | `find({ where })`           | `Between` com strings        |
| `dateGteOrNull(date)`     | `find({ where })`           | `MoreThanOrEqual OR IsNull`  |
| `toDateString(date)`      | `createQueryBuilder` params | `'YYYY-MM-DD'` string        |
| `todayString()`           | Qualquer                    | `toDateString(new Date())`   |

## O que NÃO fazer

```typescript
// ERRADO - Date objeto direto no FindOperator
startDate: LessThanOrEqual(new Date())
  // ERRADO - Date objeto em parâmetro de query builder
  .where('start_date <= :date', { date: new Date() });

// ERRADO - setHours não resolve (TypeORM serializa como ISO)
const today = new Date();
today.setHours(0, 0, 0, 0);
startDate: LessThanOrEqual(today);
```
