export type Dialect = 'pandas' | 'duckdb' | 'pyspark';

export type JoinType = 'inner' | 'left' | 'right' | 'outer' | 'cross';

export interface ColumnSchema {
	name: string;
	dtype: string;
	nullable: boolean;
}

export interface TableSchema {
	name: string;
	columns: ColumnSchema[];
}

export interface JoinClause {
	id: string;
	leftTable: string;
	leftColumn: string;
	rightTable: string;
	rightColumn: string;
	joinType: JoinType;
}

export interface SelectedColumn {
	table: string;
	column: string;
	alias: string | null;
}

export interface JoinState {
	tables: TableSchema[];
	joins: JoinClause[];
	selectedColumns: SelectedColumn[];
	outputName: string;
	dialect: Dialect;
}

export const DEFAULT_JOIN_STATE: JoinState = {
	tables: [],
	joins: [],
	selectedColumns: [],
	outputName: 'result_df',
	dialect: 'pandas'
};
