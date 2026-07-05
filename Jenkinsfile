pipeline {
    agent any

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
                sh 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && ssh-keyscan -H 192.168.1.92 >> ~/.ssh/known_hosts'
            }
        }
        stage('Sync source') {
            steps {
                sshagent(credentials: [env.CREDS]) {
                    sh './scripts/deploy.sh sync'
                }
            }
        }
        stage('Build') {
            steps {
                sshagent(credentials: [env.CREDS]) {
                    sh './scripts/deploy.sh build'
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
