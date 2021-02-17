#!/usr/bin/env node
'use strict';

import { Command } from 'commander/esm.mjs';
const program = new Command();
import Dispose from '../lib/Dispose.mjs';

program
.command('ffollowing <myId> <theirId>')
.description("Follows the people that this person is following " +
  "if they are not your follower and you don't follow them")
.requiredOption('-t, --token <token>', 'authorization token for header')
.requiredOption('-c, --csrftoken <csrftoken>', 'csrf token for header')
.action(async (myId, theirId, options) => {
  let dispose = new Dispose(options.token, options.csrftoken);
  await dispose.followFollowing(myId, theirId);
});

program
.command('ffollowers <myId> <theirId>')
.description("Follows this person's followers if they are not your follower and you don't follow them")
.requiredOption('-t, --token <token>', 'authorization token for header')
.requiredOption('-c, --csrftoken <csrftoken>', 'csrf token for header')
.action(async (myId, theirId, options) => {
  let dispose = new Dispose(options.token, options.csrftoken);
  await dispose.followFollowers(myId, theirId);
});

program
.command('clean <myId>')
.description("Unfollows the people who don't follow you back")
.requiredOption('-t, --token <token>', 'authorization token for header')
.requiredOption('-c, --csrftoken <csrftoken>', 'csrf token for header')
.action(async (myId, options) => {
  let dispose = new Dispose(options.token, options.csrftoken);
  await dispose.unfollowNonFollowers(myId);
});

program
.command('numFollowing <id>')
.description("Gets the number of people following this person")
.requiredOption('-t, --token <token>', 'authorization token for header')
.requiredOption('-c, --csrftoken <csrftoken>', 'csrf token for header')
.action(async (id, options) => {
  let dispose = new Dispose(options.token, options.csrftoken);
  await dispose.getFollowing(id).then(res => {
    console.log(res.length);
  });
});

program.parse(process.argv);