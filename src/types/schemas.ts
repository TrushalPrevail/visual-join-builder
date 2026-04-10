import { z } from 'zod';

export const ColumnSchemaZ = z.object({
	name: z.string(),
	dtype: z.string(),
	nullable: z.boolean()
});

export const TableSchemaZ = z.object({
	name: z.string(),
	columns: z.array(ColumnSchemaZ)
});

export const JoinClauseZ = z.object({
	id: z.string(),
	leftTable: z.string(),
	leftColumn: z.string(),
	rightTable: z.string(),
	rightColumn: z.string(),
	joinType: z.enum(['inner', 'left', 'right', 'outer', 'cross'])
});

export const SelectedColumnZ = z.object({
	table: z.string(),
	column: z.string(),
	alias: z.string().nullable()
});

export const JoinStateZ = z.object({
	tables: z.array(TableSchemaZ),
	joins: z.array(JoinClauseZ),
	selectedColumns: z.array(SelectedColumnZ),
	outputName: z.string().optional().default('result_df'),
	dialect: z.enum(['pandas', 'duckdb', 'pyspark'])
});

export const WebviewMessageZ = z.discriminatedUnion('command', [
	z.object({ command: z.literal('ready') }),
	z.object({
		command: z.literal('insertCode'),
		payload: z.object({ code: z.string() })
	}),
	z.object({ command: z.literal('requestTables') }),
	z.object({
		command: z.literal('requestPreview'),
		payload: z.object({ joinState: JoinStateZ })
	}),
	z.object({
		command: z.literal('saveState'),
		payload: z.object({ joinState: JoinStateZ })
	})
]);
