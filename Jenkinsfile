pipeline {
    agent any

    environment {
        PROJECT_ID   = 'project-7910093f-7276-4858-97d'
        REGION       = 'us-central1'
        REPO         = 'us-central1-docker.pkg.dev/project-7910093f-7276-4858-97d/my-app-repo'
        SERVICE_NAME = 'my-app'
        IMAGE        = "${REPO}/my-app:${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE} ."
            }
        }

        stage('Push to Artifact Registry') {
            steps {
                sh """
                    gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
                    docker push ${IMAGE}
                """
            }
        }

        stage('Deploy to Cloud Run') {
            steps {
                sh """
                    gcloud run deploy ${SERVICE_NAME} \
                        --image=${IMAGE} \
                        --region=${REGION} \
                        --platform=managed \
                        --allow-unauthenticated \
                        --port=8080 \
                        --project=${PROJECT_ID}
                """
            }
        }
    }

    post {
        success { echo "✅ Deployed to Cloud Run!" }
        failure { echo "❌ Build failed." }
        always  { sh "docker rmi ${IMAGE} || true" }
    }
}
