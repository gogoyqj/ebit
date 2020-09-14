import React from 'react';
import { Text, Color } from 'ink';
import Spinner from 'ink-spinner';

export const UIServersAreReady = ({ host, port }) => (
  <Text>
    {` UI servers are ready, running on http://${host}:${port} `} <Color yellow>{Date.now()}</Color>
  </Text>
);
