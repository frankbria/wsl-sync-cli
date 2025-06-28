#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import App from './components/App.js';

const argv = yargs(hideBin(process.argv)).argv;

render(<App argv={argv} />);
