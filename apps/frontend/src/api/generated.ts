import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Activity =
  | 'INDOOR_SIGHTSEEING'
  | 'OUTDOOR_SIGHTSEEING'
  | 'SKIING'
  | 'SURFING';

export type ActivityRankingResult = {
  __typename?: 'ActivityRankingResult';
  days: Array<DailyActivityRanking>;
  location: Location;
};

export type ActivityScore = {
  __typename?: 'ActivityScore';
  activity: Activity;
  reason: Scalars['String']['output'];
  score: Scalars['Int']['output'];
};

export type DailyActivityRanking = {
  __typename?: 'DailyActivityRanking';
  date: Scalars['String']['output'];
  rankings: Array<ActivityScore>;
};

export type Location = {
  __typename?: 'Location';
  country: Scalars['String']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  name: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  activityRankings: ActivityRankingResult;
};


export type QueryActivityRankingsArgs = {
  city: Scalars['String']['input'];
};

export type ActivityRankingsQueryVariables = Exact<{
  city: Scalars['String']['input'];
}>;


export type ActivityRankingsQuery = { __typename?: 'Query', activityRankings: { __typename?: 'ActivityRankingResult', location: { __typename?: 'Location', name: string, country: string, latitude: number, longitude: number }, days: Array<{ __typename?: 'DailyActivityRanking', date: string, rankings: Array<{ __typename?: 'ActivityScore', activity: Activity, score: number, reason: string }> }> } };


export const ActivityRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ActivityRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"city"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activityRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"city"},"value":{"kind":"Variable","name":{"kind":"Name","value":"city"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}}]}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"rankings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activity"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ActivityRankingsQuery, ActivityRankingsQueryVariables>;