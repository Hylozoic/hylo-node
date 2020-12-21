#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:12

# The javascript-node image includes a non-root node user with sudo access. Use
# the "remoteUser" property in devcontainer.json to use it. On Linux, the container
# user's GID/UIDs will be updated to match your local UID/GID when using the image
# or dockerFile property. Update USER_UID/USER_GID below if you are using the
# dockerComposeFile property or want the image itself to start with different ID
# values. See https://aka.ms/vscode-remote/containers/non-root-user for details.
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Alter node user as needed, install tslint, typescript. eslint is installed by javascript image
RUN if [ "$USER_GID" != "1000" ] || [ "$USER_UID" != "1000" ]; then \
        groupmod --gid $USER_GID $USERNAME \
        && usermod --uid $USER_UID --gid $USER_GID $USERNAME \
        && chmod -R $USER_UID:$USER_GID /home/$USERNAME \
        && chmod -R $USER_UID:root /usr/local/share/nvm /usr/local/share/npm-global; \
    fi \
    && echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

ENV GIT_EDITOR="code -w"
ENV EDITOR="code -w"
RUN git config --global core.editor "code -w"

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    # Install fish
    && echo 'deb http://download.opensuse.org/repositories/shells:/fish:/release:/3/Debian_10/ /' > /etc/apt/sources.list.d/shells:fish.list \
    && curl -L -sS https://download.opensuse.org/repositories/shells:fish:release:3/Debian_10/Release.key | apt-key add - 2>/dev/null \
    && apt-get install -y man \
    && apt-get install -y fish \
    && chsh -s /usr/bin/fish $USERNAME \
    # Postgres client
    && apt-get install -y postgresql-client \
    # Make python3 default
    && update-alternatives --install /usr/bin/python python /usr/bin/python2.7 1 \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.7 2

# Set up persistent data home dir
RUN mkdir /datahome \
    && chown $USERNAME /datahome
ENV XDG_DATA_HOME=/datahome
