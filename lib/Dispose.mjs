'use strict';

import fetch from 'isomorphic-fetch';

export default class Dispose {
  constructor(token, csrftoken) {
    this.headers = {
      'host': 'dispo.dev',
      'Content-Type': 'application/json',
      'accept': '*/*',
      'apollographql-client-version': '2.0.0-80',
      'authorization': 'token ' + token,
      'accept-language': 'en-us',
      'accept-encoding': 'gzip, deflate, br',
      'dispo-platform': 'iOS',
      'x-apollo-operation-type': 'query',
      'apollographql-client-name': 'app.davidsdisposable.davids-disposable-ios.beta-apollo-ios',
      'user-agent': 'Dispo%20%CE%B2/80 CFNetwork/1209 Darwin/20.2.0',
      'dispo-build': '80',
      'cookie': 'csrftoken=' + csrftoken
    };
  }

  getFollowingRequest(id, cursor) {
    const query =
      `query UserFollowingList($cursor: String, $userId: String!) {
      userFromId(userId: $userId) {
        __typename
        followingList(cursor: $cursor) {
          __typename
        ...followingListData
        }
      }
    }
    fragment followingListData on UserPage {
      __typename
      items {
        __typename
      ...followingListUser
      }
      hasNext
      cursor
    }
    fragment followingListUser on User {
      __typename
    ...basicUser
      following
    }
    fragment basicUser on User {
      __typename
      id
      handle
      displayName
      avatar
      verified
    }`;

    return {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        operationName: 'UserFollowingList',
        query: query,
        variables: {
          cursor: cursor,
          userId: id
        }
      })
    }
  }

  async getFollowingPage(id, cursor) {
    let promise;
    await fetch('https://dispo.dev/api/v1/graphql', this.getFollowingRequest(id, cursor))
    .then(res => res.json())
    .then(res => promise = new Promise(resolve => resolve(res)))
    .catch (err => console.error(err));
    return promise;
  }

  getFollowersRequest(id, cursor) {
    const query =
      `query UserFollowersList($cursor: String, $userId: String!) {
      userFromId(userId: $userId) {
        __typename
        followersList(cursor: $cursor) {
          __typename
          ...followingListData
        }
      }
    }
    fragment followingListData on UserPage {
      __typename
      items {
        __typename
        ...followingListUser
      }
      hasNext
      cursor
    }
    fragment followingListUser on User {
      __typename
      ...basicUser
      following
    }
    fragment basicUser on User {
      __typename
      id
      handle
      displayName
      avatar
      verified
    }`;

    return {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        operationName: 'UserFollowersList',
        query: query,
        variables: {
          cursor: cursor,
          userId: id
        }
      })
    }
  }

  async getFollowersPage(id, cursor) {
    let promise;
    await fetch('https://dispo.dev/api/v1/graphql', this.getFollowersRequest(id, cursor))
    .then(res => res.json())
    .then(res => promise = new Promise(resolve => resolve(res)))
    .catch(err => console.error(err));
    return promise;
  }

  followRequest(id, bool) {
    const query =
      `mutation FollowUserFromFollowList($follow: Boolean!, $userId: String!) {
      followUser(follow: $follow, userId: $userId) {
        __typename
        ...followingListUser
      }
    }
    fragment followingListUser on User {
      __typename
      ...basicUser
      following
    }
    fragment basicUser on User {
      __typename
      id
      handle
      displayName
      avatar
      verified
    }`;

    return {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        operationName: 'FollowUserFromFollowList',
        query: query,
        variables: {
          follow: bool,
          userId: id
        }
      })
    }
  }

  /**
   * gets list of the people this person is following
   * @param id the id of the person to query
   * @returns {Promise<unknown>} an array of the people he is following
   */
  async getFollowing(id) {
    let cursor = null;
    let hasNext = false;
    let following = [];

    do {
      await this.getFollowingPage(id, cursor).then(res => {
        let followingList = res.data.userFromId.followingList;
        hasNext = followingList.hasNext;
        cursor = followingList.cursor;

        followingList.items.forEach(user => {
          following.push(user.id);
        });

        console.log("getFollowing:", cursor);
      })
      .catch(err => console.error(err));
    } while (hasNext);

    return new Promise(res => {
      res(following);
    })
  }

  /**
   * gets list of followers
   * @param id your id
   * @returns {Promise<unknown>} an array of followers
   */
  async getFollowers(id) {
    let cursor = null;
    let hasNext = false;
    let followers = [];

    do {
      await this.getFollowersPage(id, cursor).then(res => {
        let followersList = res.data.userFromId.followersList;
        hasNext = followersList.hasNext;
        cursor = followersList.cursor;

        followersList.items.forEach(user => {
          followers.push(user.id);
        });

        console.log("followers:", cursor);
      })
      .catch(err => console.error(err));
    } while (hasNext);

    return new Promise((res, rej) => {
      res(followers);
    })
  }

  /**
   * Unfollows the people who don't follow you back
   * @param id Your id
   * @returns {Promise<void>}
   */
  async unfollowNonFollowers(id) {
    let [following, followers] = await Promise.all(
      [this.getFollowing(id), this.getFollowers(id)]
    );

    await Promise.all(following.map(async (id) => {
      if (!followers.includes(id)) {
        fetch('https://dispo.dev/api/v1/graphql', this.followRequest(id, 'false'))
        .then(res => res.json())
        .then(res => console.log("Unfollowed:", res.data.followUser.handle))
        .catch(err => console.error(err));
      }
    }));
  }

  /**
   * Follows this person's followers if they are not your follower and you don't follow them
   * @param myId Your id
   * @param theirId The person's id whose followers you wish to follow
   * @returns {Promise<void>}
   */
  async followFollowers(myId, theirId) {
    let myFollowers = await this.getFollowers(myId);

    let cursor = null;
    let hasNext = false;
    do {
      await this.getFollowersPage(theirId, cursor).then(async res => {
        let dispoFollowersPage = [];
        let page = res.data.userFromId.followersList;
        hasNext = page.hasNext;
        cursor = page.cursor;

        page.items.forEach(user => {
          dispoFollowersPage.push(user.id);
        });

        await Promise.all(dispoFollowersPage.map(async id => {
          if (!myFollowers.includes(id)) {
            fetch('https://dispo.dev/api/v1/graphql', this.followRequest(id, 'true'))
            .then(res => res.json())
            .then(res => console.log("Followed:", res.data.followUser.handle))
            .catch(err => console.error(err));
          }
        }));
      });
    } while (hasNext);
  }

  /**
   * Follows the people that this person is following if they are not your follower and you don't follow them
   * @param myId Your id
   * @param theirId The person's id whose people that they are following you wish to follow
   * @returns {Promise<void>}
   */
  async followFollowing(myId, theirId) {
    let [myFollowing, myFollowers] = await Promise.all(
      [this.getFollowing(myId, 'following.txt'), this.getFollowers(myId)]
    );

    let cursor = null;
    let hasNext = false;
    do {
      await this.getFollowingPage(theirId, cursor).then(async res => {
        let followingPage = [];
        let page = res.data.userFromId.followingList;
        hasNext = page.hasNext;
        cursor = page.cursor;

        page.items.forEach(user => {
          followingPage.push(user.id);
        });

        await Promise.all(followingPage.map(async id => {
          if (!myFollowers.includes(id) && !myFollowing.includes(id)) {
            fetch('https://dispo.dev/api/v1/graphql', this.followRequest(id, 'true'))
            .then(res => res.json())
            .then(res => console.log("Followed:", res.data.followUser.handle))
            .catch(err => console.error(err));
          }
        }));
      })
      .catch(err => console.error(err));
    } while (hasNext);
  }
}