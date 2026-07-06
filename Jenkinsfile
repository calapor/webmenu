pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:20-bookworm-slim
    command: [cat]
    tty: true
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "1Gi"
        cpu: "1"
'''
            defaultContainer 'node'
        }
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        REMOTE     = 'root@192.168.1.92'
        REMOTE_DIR = '/opt/webmenu'
        CREDS      = 'rpi5-deploy-key'
    }

    stages {
        stage('Prepare') {
            steps {
                sh 'apt-get update -qq && apt-get install -y -qq openssh-client rsync'
                sh 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && ssh-keyscan -H 192.168.1.92 >> ~/.ssh/known_hosts'
            }
        }
        stage('Build') {
            steps {
                sh 'npm ci'
                sh 'APP_VERSION="$(echo $GIT_COMMIT | cut -c1-7) (#$BUILD_NUMBER)" npm run build'
            }
        }
        stage('Sync') {
            steps {
                sshagent(credentials: [env.CREDS]) {
                    sh './scripts/deploy.sh sync'
                }
            }
        }
        stage('Install') {
            steps {
                sshagent(credentials: [env.CREDS]) {
                    sh './scripts/deploy.sh install'
                }
            }
        }
        stage('Restart') {
            steps {
                sshagent(credentials: [env.CREDS]) {
                    sh './scripts/deploy.sh restart'
                }
            }
        }
    }

    post {
        success { echo 'Deploy succeeded.' }
        failure { echo 'Deploy failed — check which stage went red above.' }
    }
}
