// https://code.amazon.com/packages/SageMakerMLFExampleNotebooksShieldsIO/trees/mainline
import {
  DynamoDBClient,
  GetItemCommand,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb'
import { BaseJsonService } from '../index.js'

const dynamoDB = new DynamoDBClient({ region: 'us-west-2' })

export default class SageMakerNotebookCiStatus extends BaseJsonService {
  static category = 'issue-tracking'
  static route = {
    base: 'sagemaker-nb',
    pattern: ':region/:notebook',
  }

  static examples = []

  static defaultBadgeData = {
    label: 'region | kernel | instance',
    color: 'informational',
  }

  static render({ region, info }) {
    return {
      label: `${region} | ${info.kernel} | ${info.instance}`,
      message: info.status,
      color:
        info.status === 'Completed'
          ? 'green'
          : info.status === 'Failed'
          ? 'red'
          : info.status === 'Stopped'
          ? 'orange'
          : info.status === 'Skipped'
          ? 'yellow'
          : 'lightgray',
    }
  }

  async getLatestCIResultDynamoDBTable() {
    const command = new ListTablesCommand({})
    try {
      const data = await dynamoDB.send(command)
      for (let idx = 0; idx < data.TableNames.length; idx++) {
        if (data.TableNames[idx].includes('latest-ci-results')) {
          return data.TableNames[idx]
        }
      }
      throw new Error('latest CI table not found')
    } catch (err) {
      console.error(err)
    }
  }

  async getDynamoDBItem(params) {
    const command = new GetItemCommand(params)
    try {
      const data = await dynamoDB.send(command)
      return {
        instance: data.Item.instance.S,
        kernel: data.Item.kernel.S,
        status: data.Item.status.S,
      }
    } catch (err) {
      console.error(err)
    }
  }

  async fetch({ region, notebook }) {
    const tableName = await this.getLatestCIResultDynamoDBTable()

    const params = {
      TableName: tableName,
      Key: {
        'notebook-region': { S: `${notebook}-${region}` },
      },
    }

    return await this.getDynamoDBItem(params)
  }

  async handle({ region, notebook }) {
    notebook = notebook.replaceAll('|', '/')
    const info = await this.fetch({
      region,
      notebook,
    })
    return this.constructor.render({
      region,
      info,
    })
  }
}
