<template>
  <Layout>
    <div class="wrap">
      <header class="top">
        <button class="chip" @click="$router.push('/dashboard')">← Dashboard</button>

        <div class="titleBlock">
          <div class="titleRow">
            <div class="title">AddisGo Live</div>
            <span class="badge" :class="mode === 'host' ? 'host' : 'watch'">
              {{ mode === "host" ? "HOST" : "WATCH" }}
            </span>
            <span class="badge live" v-if="socketConnected">SOCKET</span>
          </div>

          <div class="metaRow">
            <span>Live ID: <b class="mono">{{ liveId }}</b></span>
            <span class="dot">•</span>
            <span>Viewers: <b class="mono">{{ viewers }}</b></span>
            <span class="dot">•</span>
            <span>Status: <b>{{ status }}</b></span>
            <span class="dot">•</span>
            <span>ICE: <b>{{ iceMode }}</b></span>
          </div>
        </div>

        <div class="rightBtns">
          <button class="chip" @click="toggleChat">{{ chatOpen ? "Hide Chat" : "Show Chat" }}</button>
          <button class="chip primary" @click="copyLink">Share</button>
        </div>
      </header>

      <!-- Host mic request popup -->
      <div v-if="mode === 'host' && micRequests.length" class="card popup">
        <div class="popupTitle">🎤 Mic Requests</div>
        <div class="popupList">
          <div class="req" v-for="r in micRequests" :key="r.fromUserId">
            <div class="reqLeft">
              <div class="reqName">{{ r.fromName }}</div>
            </div>
          </div>
        </div>
      </div>