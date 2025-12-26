import { Request, Response } from 'express';
import * as k8s from '@kubernetes/client-node';

/**
 * Trigger a Spotify sync job in Kubernetes
 */
export async function triggerSync(req: Request, res: Response) {
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const batchApi = kc.makeApiClient(k8s.BatchV1Api);
    const namespace = 'spotify';

    // Generate unique job name
    const timestamp = Date.now();
    const jobName = `spotify-sync-${timestamp}`;

    // Job manifest
    const job: k8s.V1Job = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: jobName,
        namespace: namespace,
        labels: {
          app: 'spotify-sync',
          'triggered-by': 'web-ui'
        }
      },
      spec: {
        ttlSecondsAfterFinished: 3600, // Clean up after 1 hour
        template: {
          metadata: {
            labels: {
              app: 'spotify-sync',
              job: jobName
            }
          },
          spec: {
            restartPolicy: 'OnFailure',
            containers: [
              {
                name: 'sync',
                image: 'spotify-sync:latest',
                imagePullPolicy: 'Never',
                env: [
                  {
                    name: 'DATABASE_PATH',
                    value: '/data/spotify.db'
                  },
                  {
                    name: 'SPOTIFY_CLIENT_ID',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'spotify-credentials',
                        key: 'client-id'
                      }
                    }
                  },
                  {
                    name: 'SPOTIFY_CLIENT_SECRET',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'spotify-credentials',
                        key: 'client-secret'
                      }
                    }
                  },
                  {
                    name: 'SPOTIFY_DB_ENCRYPTION_KEY',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'spotify-credentials',
                        key: 'encryption-key'
                      }
                    }
                  },
                  {
                    name: 'TELEGRAM_BOT_TOKEN',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'telegram-credentials',
                        key: 'bot-token',
                        optional: true
                      }
                    }
                  },
                  {
                    name: 'TELEGRAM_CHAT_ID',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'telegram-credentials',
                        key: 'chat-id',
                        optional: true
                      }
                    }
                  }
                ],
                volumeMounts: [
                  {
                    name: 'data',
                    mountPath: '/data'
                  }
                ],
                resources: {
                  requests: {
                    memory: '256Mi',
                    cpu: '100m'
                  },
                  limits: {
                    memory: '1Gi',
                    cpu: '500m'
                  }
                }
              }
            ],
            volumes: [
              {
                name: 'data',
                persistentVolumeClaim: {
                  claimName: 'spotify-data'
                }
              }
            ]
          }
        }
      }
    };

    // Create the job
    console.log(`Creating sync job: ${jobName}`);
    await batchApi.createNamespacedJob(namespace, job);

    res.json({
      status: 'success',
      message: 'Sync job created',
      jobName: jobName
    });

  } catch (error) {
    console.error('Error triggering sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to trigger sync',
      details: errorMessage
    });
  }
}
